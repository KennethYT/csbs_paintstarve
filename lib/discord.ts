import { pool } from "@/lib/db";
import type { Role } from "@/lib/types";

type DiscordMember = {
  nick: string | null;
  roles: string[];
  user?: {
    username?: string;
    global_name?: string | null;
  };
};

export type DiscordResolveResult =
  | { ok: true; role: Role; guildId: string; guildName: string; matchedRoleId: string; displayName: string }
  | { ok: false; status: number; message: string };

const DISCORD_API_BASE = "https://discord.com/api/v10";

function parseRoleIds(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((roleId) => roleId.replaceAll('"', "").trim())
    .filter(Boolean);
}

/**
 * 依 Discord 伺服器的身份組決定使用者角色，並寫回資料庫。
 * Discord 是角色的權威來源，每次驗證都會覆寫本地的 role。
 */
export async function resolveDiscordRoleForUser(
  userId: string,
  fallbackName: string | null
): Promise<DiscordResolveResult> {
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

  const matchedTeacherRoleId = teacherRoleIds.find((roleId) => roleIds.includes(roleId));
  const matchedStudentRoleId = studentRoleIds.find((roleId) => roleIds.includes(roleId));

  let role: Role | null = null;
  let matchedRoleId = "";

  if (matchedTeacherRoleId) {
    role = "teacher";
    matchedRoleId = matchedTeacherRoleId;
  } else if (matchedStudentRoleId) {
    role = "student";
    matchedRoleId = matchedStudentRoleId;
  }

  if (!role) {
    return { ok: false, status: 403, message: "已在伺服器內，但未匹配到教職員或學生身份組。" };
  }

  const guildResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store"
  });

  const guildName = guildResponse.ok
    ? (((await guildResponse.json()) as { name?: string }).name ?? guildId)
    : guildId;

  const displayName =
    member.nick ?? member.user?.global_name ?? member.user?.username ?? fallbackName ?? "Discord 使用者";

  try {
    await pool.query(`UPDATE "user" SET role = $1, name = $2, "updatedAt" = now() WHERE id = $3`, [
      role,
      displayName,
      userId
    ]);
  } catch {
    return { ok: false, status: 500, message: "寫入使用者身分失敗。" };
  }

  return { ok: true, role, guildId, guildName, matchedRoleId, displayName };
}
