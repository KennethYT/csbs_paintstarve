import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveDiscordRoleForUser } from "@/lib/discord";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "尚未登入，請先完成 Discord OAuth。" }, { status: 401 });
  }

  const result = await resolveDiscordRoleForUser(session.user.id, session.user.name ?? null);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json(result);
}
