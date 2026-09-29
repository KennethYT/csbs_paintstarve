import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { SubmissionList } from "@/components/submission-list";
import { GALLERY_SUBMISSION_ENABLED } from "@/lib/course-constants";
import { listSubmissions } from "@/lib/gallery-submissions";
import { isGalleryAdmin } from "@/lib/gallery-admins";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "管理投稿 | 暑期選修作品畫廊"
};

/** 管理員（lib/gallery-admins.ts 清單裡的 Discord 帳號）下架／恢復投稿。lib/gallery.ts 裡的既有作品要改程式碼，不在這裡管。 */
export default async function ManagePage() {
  if (!GALLERY_SUBMISSION_ENABLED) {
    redirect("/");
  }

  const user = await requireUser();

  if (!(await isGalleryAdmin(user.id))) {
    redirect("/submit");
  }

  const submissions = await listSubmissions("all").catch((error: unknown) => {
    console.error("[manage] 讀取投稿失敗", error);
    return null;
  });

  return (
    <div className="app-shell">
      <SiteHeader>
        <Link href="/submit" className="btn btn-ghost">
          投稿作品
        </Link>
        <Link href="/" className="btn btn-ghost">
          回到畫廊
        </Link>
        <span className="app-header__user-name">{user.name}</span>
        <SignOutButton />
      </SiteHeader>

      <main className="app-container app-main">
        <div className="submit-page fade-up">
          <header className="landing-hero">
            <div className="landing-hero__eyebrow">Manage</div>
            <h1 className="landing-hero__title">管理投稿</h1>
            <p className="landing-hero__text">
              投稿送出後會立即公開。發現不適當或違反網站規範的作品可以在這裡下架，下架後也可以再恢復。
            </p>
          </header>

          <SubmissionList items={submissions} admin />
        </div>
      </main>
    </div>
  );
}
