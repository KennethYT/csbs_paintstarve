import type { Role } from "@/lib/types";

/** 各身分登入後的入口頁。client / server 都會用到，所以不能放在 lib/session.ts（它依賴 next/headers）。 */
export function getRoleHome(role: Role): "/teacher/courses" | "/student/browse" {
  return role === "teacher" ? "/teacher/courses" : "/student/browse";
}

export const ROLE_AREA_LABEL: Record<Role, string> = {
  student: "學生區",
  teacher: "教師區"
};
