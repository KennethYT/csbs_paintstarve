import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { SubmissionForm } from "@/components/submission-form";
import { SubmissionList } from "@/components/submission-list";
import { GALLERY_SUBMISSION_ENABLED } from "@/lib/course-constants";
import { listSubmissions } from "@/lib/gallery-submissions";
import { isGalleryAdmin } from "@/lib/gallery-admins";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "投稿作品 | 暑期選修作品畫廊"
};

/** 登入後唯一能做的事：投稿圖片／連結到畫廊，並查看自己投過的作品。 */
export default async function SubmitPage() {
  if (!GALLERY_SUBMISSION_ENABLED) {
    redirect("/");
  }

  const user = await requireUser();
  const [mine, isAdmin] = await Promise.all([
    listSubmissions({ userId: user.id }).catch((error: unknown) => {
      console.error("[submit] 讀取投稿失敗", error);
      return null;
    }),
    isGalleryAdmin(user.id).catch(() => false)
  ]);

  return (
    <div className="app-shell">
      <SiteHeader>
        {isAdmin ? (
          <Link href="/manage" className="btn btn-ghost">
            管理投稿
          </Link>
        ) : null}
        <Link href="/" className="btn btn-ghost">
          回到畫廊
        </Link>
        <span className="app-header__user-name">{user.name}</span>
        <SignOutButton />
      </SiteHeader>

      <main className="app-container app-main">
        <div className="submit-page fade-up">
          <header className="landing-hero">
            <div className="landing-hero__eyebrow">Submit</div>
            <h1 className="landing-hero__title">投稿作品</h1>
            <p className="landing-hero__text">
              上傳圖片或貼上 YouTube 連結，送出後會立即公開在畫廊。要下架或修改已投稿的作品，請聯絡管理員。
            </p>
          </header>

          <SubmissionForm defaultArtistName={user.name} />

          <section className="submit-page__mine">
            <h2 className="section-title">我的投稿</h2>
            <SubmissionList items={mine} />
          </section>
        </div>
      </main>
    </div>
  );
}
