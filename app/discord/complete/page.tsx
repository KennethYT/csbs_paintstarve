import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveDiscordRoleForUser } from "@/lib/discord";

/**
 * Discord OAuth 的回呼落點。身份組解析在伺服器端完成後直接導向對應入口，
 * 不需要在 client 端用 effect 去打 API。
 */
export default async function DiscordCompletePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login?discord=unauthenticated");
  }

  const result = await resolveDiscordRoleForUser(session.user.id, session.user.name ?? null);

  if (!result.ok) {
    redirect(`/login?discord=failed&reason=${encodeURIComponent(result.message)}`);
  }

  redirect(result.role === "teacher" ? "/teacher/courses" : "/student/browse");
}
