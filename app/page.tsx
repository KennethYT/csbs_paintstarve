import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Gallery } from "@/components/gallery";
import { ShieldIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { GALLERY_WORKS } from "@/lib/gallery";
import { getRoleHome, ROLE_AREA_LABEL } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

/**
 * 公開首頁：作品畫廊。未登入也看得到，不再依身分自動轉址。
 * 登入後的導向由 app/discord/complete 負責，這裡只在右上角提供對應入口。
 */
export default async function HomePage() {
  // session 只用來決定右上角的按鈕。資料庫或 auth 設定出問題時畫廊照樣要能看，當作未登入處理。
  // headers() 在 build 時會丟 Next 內部的 DYNAMIC_SERVER_USAGE 來把頁面標成動態，那種要原樣丟回去。
  const user = await getSessionUser().catch((error: unknown) => {
    unstable_rethrow(error);
    console.error("[home] 讀取 session 失敗，改以未登入顯示", error);
    return null;
  });

  const artistCount = new Set(GALLERY_WORKS.flatMap((work) => work.artists.map((artist) => artist.name))).size;

  return (
    <div className="app-shell">
      <SiteHeader>
        <Link href="/rules" className="btn btn-ghost">
          網站規範
        </Link>
        {user ? (
          <>
            <span className="app-header__user-name">{user.name}</span>
            <Link href={getRoleHome(user.role)} className="btn btn-brand landing-cta">
              進入{ROLE_AREA_LABEL[user.role]}
            </Link>
          </>
        ) : (
          <Link href="/login" className="btn btn-brand landing-cta">
            登入
          </Link>
        )}
      </SiteHeader>

      <main className="app-container app-main">
        <section className="landing-hero fade-up">
          <div className="landing-hero__eyebrow">Gallery</div>
          <h1 className="landing-hero__title">作品畫廊</h1>
          <p className="landing-hero__text">同學們在課堂內外留下的創作。點一下作品就能放大觀看，多頁的作品可以左右翻頁。</p>
          {GALLERY_WORKS.length ? (
            <div className="landing-hero__stats">
              <span>
                <strong>{GALLERY_WORKS.length}</strong> 件作品
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

        {GALLERY_WORKS.length ? (
          <Gallery works={GALLERY_WORKS} />
        ) : (
          <div className="card empty-state">目前還沒有作品，敬請期待。</div>
        )}
      </main>
    </div>
  );
}
