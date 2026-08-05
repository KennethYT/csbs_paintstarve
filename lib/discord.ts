import { getPool } from "@/lib/db";
import type { Role } from "@/lib/types";

type DiscordMember = {
  nick: string | null;
  roles: string[];
  user?: {
    username?: string;
    global_name?: string | null;
  };
};

const DISCORD_API_BASE = "https://discord.com/api/v10";

function parseRoleIds(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((roleId) => roleId.replaceAll('"', "").trim())
    .filter(Boolean);
}

type DiscordMemberLookup =
  | {
      ok: true;
      guildId: string;
      guildName: string;
      displayName: string;
      /** 符合的教師身份組 id，沒有就是 null */
      teacherRoleId: string | null;
      /** 符合的學生身份組 id，沒有就是 null */
      studentRoleId: string | null;
    }
  | { ok: false; status: number; message: string };

/**
 * 對 Discord 查一次這個人目前實際持有哪些身份組。resolveDiscordRoleForUser（登入時）
 * 跟 switchDiscordRole（身分切換時）共用這段，確保兩者看到的都是當下最新的身份組，
 * 不是快取的舊結果。
 */
async function lookupDiscordMember(userId: string, fallbackName: string | null): Promise<DiscordMemberLookup> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const teacherRoleIds = parseRoleIds(process.env.DISCORD_TEACHER_ROLE_ID);
  const studentRoleIds = parseRoleIds(process.env.DISCORD_STUDENT_ROLE_ID);

  if (!botToken || !guildId || teacherRoleIds.length === 0 || studentRoleIds.length === 0) {
    return {
      ok: false,
      status: 500,
      message:
        "缺少 Discord 驗證設定，請檢查 DISCORD_BOT_TOKEN / DISCORD_GUILD_ID / DISCORD_TEACHER_ROLE_ID / DISCORD_STUDENT_ROLE_ID。"
    };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ accountId: string }>(
    `SELECT "accountId" FROM account WHERE "userId" = $1 AND "providerId" = $2 LIMIT 1`,
    [userId, "discord"]
  );
  const account = rows[0];

  if (!account?.accountId) {
    return { ok: false, status: 400, message: "目前帳號未綁定 Discord。" };
  }

  const memberResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${account.accountId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store"
  });

  if (memberResponse.status === 404) {
    return { ok: false, status: 403, message: "此使用者不在指定的 Discord 伺服器內。" };
  }

  if (!memberResponse.ok) {
    return {
      ok: false,
      status: 502,
      message: `Discord 伺服器驗證失敗（HTTP ${memberResponse.status}）。`
    };
  }

  const member = (await memberResponse.json()) as DiscordMember;
  const roleIds = member.roles ?? [];

  const teacherRoleId = teacherRoleIds.find((roleId) => roleIds.includes(roleId)) ?? null;
  const studentRoleId = studentRoleIds.find((roleId) => roleIds.includes(roleId)) ?? null;

  const guildResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store"
  });

  const guildName = guildResponse.ok
    ? (((await guildResponse.json()) as { name?: string }).name ?? guildId)
    : guildId;

  const displayName =
    member.nick ?? member.user?.global_name ?? member.user?.username ?? fallbackName ?? "Discord 使用者";

  return { ok: true, guildId, guildName, displayName, teacherRoleId, studentRoleId };
}

export type DiscordResolveResult =
  | {
      ok: true;
      role: Role;
      guildId: string;
      guildName: string;
      matchedRoleId: string;
      displayName: string;
      canSwitchRole: boolean;
    }
  | { ok: false; status: number; message: string };

/**
 * 依 Discord 伺服器的身份組決定使用者角色，並寫回資料庫。
 * Discord 是角色的權威來源，每次驗證都會覆寫本地的 role。
 *
 * 同時有教師跟學生兩個身份組的人（例如助教）預設先給教師身分，但會標記
 * canSwitchRole，讓他之後可以透過 /api/switch-role 自由切換到學生視角。
 */
export async function resolveDiscordRoleForUser(
  userId: string,
  fallbackName: string | null
): Promise<DiscordResolveResult> {
  const lookup = await lookupDiscordMember(userId, fallbackName);

  if (!lookup.ok) {
    return lookup;
  }

  const { guildId, guildName, displayName, teacherRoleId, studentRoleId } = lookup;

  if (!teacherRoleId && !studentRoleId) {
    return { ok: false, status: 403, message: "已在伺服器內，但未匹配到教職員或學生身份組。" };
  }

  const role: Role = teacherRoleId ? "teacher" : "student";
  const matchedRoleId = teacherRoleId ?? studentRoleId ?? "";
  const canSwitchRole = Boolean(teacherRoleId && studentRoleId);

  try {
    await getPool().query(
      `UPDATE "user" SET role = $1, name = $2, "canSwitchRole" = $3, "updatedAt" = now() WHERE id = $4`,
      [role, displayName, canSwitchRole, userId]
    );
  } catch {
    return { ok: false, status: 500, message: "寫入使用者身分失敗。" };
  }

  return { ok: true, role, guildId, guildName, matchedRoleId, displayName, canSwitchRole };
}

export type SwitchRoleResult = { ok: true; role: Role } | { ok: false; status: number; message: string };

/**
 * 把使用者切換到另一個身分，切換前重新對 Discord 確認他目前是否真的持有目標
 * 身份組（不信任上次登入存下來的 canSwitchRole，那只是拿來決定要不要顯示切換鈕）。
 */
export async function switchDiscordRole(
  userId: string,
  targetRole: Role,
  fallbackName: string | null
): Promise<SwitchRoleResult> {
  const lookup = await lookupDiscordMember(userId, fallbackName);

  if (!lookup.ok) {
    return lookup;
  }

  const { displayName, teacherRoleId, studentRoleId } = lookup;
  const hasTargetRole = targetRole === "teacher" ? Boolean(teacherRoleId) : Boolean(studentRoleId);

  if (!hasTargetRole) {
    return {
      ok: false,
      status: 403,
      message:
        targetRole === "teacher"
          ? "你在 Discord 沒有教師身份組，無法切換。"
          : "你在 Discord 沒有學生身份組，無法切換。"
    };
  }

  const canSwitchRole = Boolean(teacherRoleId && studentRoleId);

  try {
    await getPool().query(
      `UPDATE "user" SET role = $1, name = $2, "canSwitchRole" = $3, "updatedAt" = now() WHERE id = $4`,
      [targetRole, displayName, canSwitchRole, userId]
    );
  } catch {
    return { ok: false, status: 500, message: "切換身分失敗。" };
  }

  return { ok: true, role: targetRole };
}
