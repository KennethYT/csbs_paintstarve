import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Gallery } from "@/components/gallery";
import { ShieldIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { COURSE_SYSTEM_ENABLED, GALLERY_SUBMISSION_ENABLED, LOGIN_ENABLED } from "@/lib/course-constants";
import { GALLERY_WORKS } from "@/lib/gallery";
import { listPublishedWorks } from "@/lib/gallery-submissions";
import { isGalleryAdmin } from "@/lib/gallery-admins";
import { getRoleHome, ROLE_AREA_LABEL } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

/** session 只用來決定右上角的按鈕。資料庫或 auth 設定出問題時畫廊照樣要能看，當作未登入處理。 */
async function readSessionUser() {
  return getSessionUser().catch((error: unknown) => {
    // headers() 在 build 時會丟 Next 內部的 DYNAMIC_SERVER_USAGE 來把頁面標成動態，那種要原樣丟回去
    unstable_rethrow(error);
    console.error("[home] 讀取 session 失敗，改以未登入顯示", error);
    return null;
  });
}

/** 登入後投稿的作品。資料庫出問題（或還沒跑 db:push）時只顯示既有作品，畫廊不跟著掛掉。 */
async function readSubmittedWorks() {
  return listPublishedWorks().catch((error: unknown) => {
    console.error("[home] 讀取投稿作品失敗，只顯示既有作品", error);
    return [];
  });
}

/**
 * 公開首頁：作品畫廊 = 投稿作品（新的在前）+ lib/gallery.ts 的既有作品。
 * 右上角依開關與登入狀態顯示「登入投稿」／「投稿作品」／「管理投稿」（見 lib/course-constants.ts）。
 */
export default async function HomePage() {
  // 投稿作品存在資料庫，每次請求都要重新讀，不能在 build 時就產生好
  await connection();

  const [user, submittedWorks] = await Promise.all([
    LOGIN_ENABLED ? readSessionUser() : Promise.resolve(null),
    readSubmittedWorks()
  ]);
  const isAdmin = user && GALLERY_SUBMISSION_ENABLED ? await isGalleryAdmin(user.id).catch(() => false) : false;
  const works = [...submittedWorks, ...GALLERY_WORKS];
  const artistCount = new Set(works.flatMap((work) => work.artists.map((artist) => artist.name))).size;

  return (
    <div className="app-shell">
      <SiteHeader>
        <Link href="/rules" className="btn btn-ghost">
          網站規範
        </Link>
        {isAdmin ? (
          <Link href="/manage" className="btn btn-ghost">
            管理投稿
          </Link>
        ) : null}
        {user && COURSE_SYSTEM_ENABLED ? (
          <Link href={getRoleHome(user.role)} className="btn btn-ghost">
            進入{ROLE_AREA_LABEL[user.role]}
          </Link>
        ) : null}
        {user && GALLERY_SUBMISSION_ENABLED ? (
          <Link href="/submit" className="btn btn-brand landing-cta">
            投稿作品
          </Link>
        ) : null}
        {!user && LOGIN_ENABLED ? (
          <Link href="/login" className="btn btn-brand landing-cta">
            {GALLERY_SUBMISSION_ENABLED ? "登入投稿" : "登入"}
          </Link>
        ) : null}
      </SiteHeader>

      <main className="app-container app-main">
        <section className="landing-hero fade-up">
          <div className="landing-hero__eyebrow">Gallery</div>
          <h1 className="landing-hero__title">作品畫廊</h1>
          <p className="landing-hero__text">
            同學們在課堂內外留下的創作。點一下作品就能放大觀看，多頁的作品可以左右翻頁。
            {GALLERY_SUBMISSION_ENABLED ? "登入後也可以投稿自己的作品。" : null}
          </p>
          {works.length ? (
            <div className="landing-hero__stats">
              <span>
                <strong>{works.length}</strong> 件作品
              </span>
              <span>
                <strong>{artistCount}</strong> 位創作者
              </span>
            </div>
          ) : null}
        </section>

        <aside className="rights-notice" aria-label="作品使用規範">
          <ShieldIcon className="rights-notice__icon" aria-hidden="true" />
          <p>
            所有作品的著作權屬於原作者，僅供在本站瀏覽。
            <strong>禁止用於 AI 訓練或生成、禁止轉載與商業使用</strong>，瀏覽本站即表示你同意
            <Link href="/rules" className="rights-notice__link">
              網站規範
            </Link>
            。
          </p>
        </aside>

        {works.length ? <Gallery works={works} /> : <div className="card empty-state">目前還沒有作品，敬請期待。</div>}
      </main>
    </div>
  );
}
