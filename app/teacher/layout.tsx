import type { ReactNode } from "react";
import { RoleShell } from "@/components/role-shell";

export default function TeacherLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <RoleShell
      role="teacher"
      tabs={[
        { label: "我的課程", href: "/teacher/courses" },
        { label: "建立課程", href: "/teacher/courses/new" },
        { label: "儀表板", href: "/teacher/dashboard" }
      ]}
    >
      {children}
    </RoleShell>
  );
}