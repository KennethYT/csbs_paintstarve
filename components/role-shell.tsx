import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { COURSE_SYSTEM_ENABLED } from "@/lib/course-constants";
import { requireRole } from "@/lib/session";
import { ClassroomProvider } from "@/components/classroom-store";
import { getCoursesSnapshot } from "@/lib/course-service";
import type { Role } from "@/lib/types";

type ShellTab = {
  label: string;
  href: string;
};

/**
 * Server component。權限在這裡把關 —— 先前的版本是 client 端 useEffect redirect，
 * 關掉 JS 或直接請求就繞得過去。
 */
export async function RoleShell({
  role,
  tabs,
  children
}: Readonly<{ role: Role; tabs: ShellTab[]; children: ReactNode }>) {
  // 選課系統關閉時學生區／教師區整個不開放，已登入的人也一樣導回首頁
  if (!COURSE_SYSTEM_ENABLED) {
    redirect("/");
  }

  const user = await requireRole(role);
  // 首屏資料在伺服器就取好，避免進頁面先閃一次骨架
  const snapshot = await getCoursesSnapshot(user.id);

  return (
    <ClassroomProvider
      user={user}
      initialCourses={snapshot.courses}
      initialEnrollments={snapshot.enrollments}
    >
      <div className="app-shell">
        <AppHeader role={role} tabs={tabs} userName={user.name} canSwitchRole={user.canSwitchRole} />
        <main className="app-container app-main">{children}</main>
      </div>
    </ClassroomProvider>
  );
}
