import Image from "next/image";
import type { ReactNode } from "react";
import { BRAND_LOGO_SRC, BRAND_NAME, BrandLogo } from "@/components/brand";

/**
 * 登入頁的左側視覺 + 右側側欄外框。
 * 版面與內容分開，登入表單本身由 app/login/page.tsx 以 children 傳入。
 */
export function AuthHero({
  title,
  subtitle,
  sidebarText,
  children
}: Readonly<{
  title: string;
  subtitle: string;
  sidebarText: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div className="login-page">
      <section className="login-hero fade-up">
        <div className="login-hero__glow login-hero__glow--pink" />
        <div className="login-hero__glow login-hero__glow--gold" />
        <div className="login-hero__glow login-hero__glow--green" />
        <div className="login-hero__ribbon login-hero__ribbon--top" />
        <div className="login-hero__ribbon login-hero__ribbon--middle" />
        <div className="login-hero__ribbon login-hero__ribbon--bottom" />

        <div className="login-hero__content">
          <div className="login-hero__eyebrow">Course Selection Platform</div>
          <div className="login-hero__title">{title}</div>
          <div className="login-hero__subtitle">{subtitle}</div>
        </div>

        <div className="login-hero__artboard" aria-hidden="true">
          <div className="login-hero__panel login-hero__panel--primary">
            <div className="login-hero__panel-grid" />
            <div className="login-hero__panel-orb" />
          </div>
          <div className="login-hero__panel login-hero__panel--secondary">
            <div className="login-hero__crest-wrap">
              <Image
                src={BRAND_LOGO_SRC}
                alt=""
                fill
                className="login-hero__crest"
                sizes="(max-width: 960px) 45vw, 420px"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <aside className="login-sidebar">
        <div className="login-sidebar__inner">
          <div className="login-sidebar__brand">
            <div className="login-sidebar__logo-wrap">
              <BrandLogo size={96} className="login-sidebar__logo" priority />
            </div>
            <div>
              <div className="login-sidebar__brand-title">{BRAND_NAME}</div>
              <div className="login-sidebar__brand-text">{sidebarText}</div>
            </div>
          </div>

          {children}
        </div>
      </aside>
    </div>
  );
}
