import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_NAME, BrandLogo } from "@/components/brand";

/**
 * 公開頁面（首頁、網站規範）的頁首。學生區／教師區用的是 components/app-header.tsx，
 * 那個依賴 ClassroomProvider，這裡不能用。右側按鈕由各頁面以 children 傳入。
 */
export function SiteHeader({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <header className="app-header glass-panel">
      <div className="app-container app-header__inner">
        <Link href="/" className="app-header__brand">
          <BrandLogo size={34} priority />
          <span className="app-header__brand-name">{BRAND_NAME}</span>
        </Link>

        <div className="app-header__user">{children}</div>
      </div>
    </header>
  );
}
