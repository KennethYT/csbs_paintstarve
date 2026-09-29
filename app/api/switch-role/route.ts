import { NextResponse } from "next/server";
import { courseSystemClosed } from "@/lib/api";
import { switchDiscordRole } from "@/lib/discord";
import { getSessionUserFromRequest } from "@/lib/session";

/**
 * 給同時持有教師與學生兩個 Discord 身份組的人（例如助教）用的正式切換身分端點。
 * 每次切換都重新對 Discord 確認目前是否真的持有目標身份組，不信任任何快取結果
 * （見 lib/discord.ts 的 switchDiscordRole）。
 */
export async function POST(request: Request) {
  const closed = courseSystemClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "尚未登入。" }, { status: 401 });
  }

  const targetRole = user.role === "teacher" ? "student" : "teacher";
  const result = await switchDiscordRole(user.id, targetRole, user.name);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, role: result.role });
}
