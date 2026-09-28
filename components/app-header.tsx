"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_NAME, BrandLogo } from "@/components/brand";
import { authClient } from "@/lib/auth-client";
import { useClassroom } from "@/components/classroom-store";
import { getRoleHome } from "@/lib/roles";
import type { Role } from "@/lib/types";

type HeaderTab = {
  label: string;
  href: string;
};

export function AppHeader({
  role,
  tabs,
  userName,
  canSwitchRole
}: Readonly<{
  role: Role;
  tabs: HeaderTab[];
  userName: string;
  canSwitchRole: boolean;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useClassroom();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isDevSwitchingRole, setIsDevSwitchingRole] = useState(false);
  const roleLabel = role === "teacher" ? "教師" : "學生";

  const handleLogout = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  };

  /** 給同時持有教師／學生兩個 Discord 身份組的人用，每次都會重新對 Discord 確認。 */
  const handleSwitchRole = async () => {
    setIsSwitchingRole(true);

    try {
      const response = await fetch("/api/switch-role", { method: "POST" });
      const payload = (await response.json()) as { ok: boolean; role?: Role; message?: string };

      // 首頁現在是公開畫廊、不會再依身分轉址，所以直接跳到新身分的入口。
      // 用整頁跳轉而不是 router.push，讓 RoleShell 重新做一次角色把關。
      if (response.ok && payload.ok && payload.role) {
        window.location.href = getRoleHome(payload.role);
        return;
      }

      showToast(payload.message ?? "切換身分失敗。");
    } catch {
      showToast("切換身分失敗，請檢查網路後再試。");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleDevSwitchRole = async () => {
    setIsDevSwitchingRole(true);

    try {
      const response = await fetch("/api/dev/switch-role", { method: "POST" });
      const payload = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; role?: Role };

      if (response.ok && payload.ok && payload.role) {
        window.location.href = getRoleHome(payload.role);
        return;
      }
    } finally {
      setIsDevSwitchingRole(false);
    }
  };

  return (
    <header className="app-header glass-panel">
      <div className="app-container app-header__inner">
        <Link href="/" className="app-header__brand">
          <BrandLogo size={34} priority />
          <span className="app-header__brand-name">{BRAND_NAME}</span>
        </Link>

        <nav className="app-header__nav" aria-label="主要導覽">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href as Route}
                className="tab"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-header__user">
          <span className="badge badge-role">{roleLabel}</span>
          <span className="app-header__user-name">{userName}</span>
          {canSwitchRole ? (
            <button
              className="btn btn-ghost"
              onClick={() => void handleSwitchRole()}
              disabled={isSwitchingRole}
              title="你在 Discord 同時有教師與學生身份組，可以自由切換"
            >
              {isSwitchingRole ? "切換中…" : `切成${role === "teacher" ? "學生" : "教師"}身分`}
            </button>
          ) : null}
          {process.env.NODE_ENV !== "production" ? (
            <button
              className="btn btn-ghost"
              onClick={() => void handleDevSwitchRole()}
              disabled={isDevSwitchingRole}
              title="開發用：不經過 Discord，直接切換身分"
            >
              {isDevSwitchingRole ? "切換中…" : `切成${role === "teacher" ? "學生" : "教師"} (dev)`}
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={() => void handleLogout()} disabled={isSigningOut}>
            {isSigningOut ? "登出中…" : "登出"}
          </button>
        </div>
      </div>
    </header>
  );
}
