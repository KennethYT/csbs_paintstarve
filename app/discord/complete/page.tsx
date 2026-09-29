import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { COURSE_SYSTEM_ENABLED, LOGIN_ENABLED } from "@/lib/course-constants";
import { resolveDiscordRoleForUser } from "@/lib/discord";
import { getRoleHome } from "@/lib/roles";

/**
 * Discord OAuth 的回呼落點。身份組解析在伺服器端完成後直接導向對應入口，
 * 不需要在 client 端用 effect 去打 API。
 */
export default async function DiscordCompletePage() {
  if (!LOGIN_ENABLED) {
    redirect("/");
  }

  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login?discord=unauthenticated");
  }

  const result = await resolveDiscordRoleForUser(session.user.id, session.user.name ?? null);

  if (!result.ok) {
    redirect(`/login?discord=failed&reason=${encodeURIComponent(result.message)}`);
  }

  // 選課系統關閉時登入只為了投稿，直接進投稿頁
  redirect(COURSE_SYSTEM_ENABLED ? getRoleHome(result.role) : "/submit");
}
