import type { ReactNode } from "react";
import { RoleShell } from "@/components/role-shell";

export default function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <RoleShell
      role="student"
      tabs={[
        { label: "瀏覽課程", href: "/student/browse" },
        { label: "我的課表", href: "/student/schedule" }
      ]}
    >
      {children}
    </RoleShell>
  );
}