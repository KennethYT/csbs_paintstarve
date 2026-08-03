"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_NAME, BrandLogo } from "@/components/brand";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/types";

type HeaderTab = {
  label: string;
  href: string;
};

export function AppHeader({
  role,
  tabs,
  userName
}: Readonly<{
  role: Role;
  tabs: HeaderTab[];
  userName: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const roleLabel = role === "teacher" ? "教師" : "學生";

  const handleLogout = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  };

  const handleSwitchRole = async () => {
    setIsSwitchingRole(true);

    try {
      const response = await fetch("/api/dev/switch-role", { method: "POST" });

      if (response.ok) {
        window.location.href = "/";
        return;
      }
    } finally {
      setIsSwitchingRole(false);
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
          {process.env.NODE_ENV !== "production" ? (
            <button
              className="btn btn-ghost"
              onClick={() => void handleSwitchRole()}
              disabled={isSwitchingRole}
              title="開發用：不經過 Discord，直接切換身分"
            >
              {isSwitchingRole ? "切換中…" : `切成${role === "teacher" ? "學生" : "教師"} (dev)`}
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
