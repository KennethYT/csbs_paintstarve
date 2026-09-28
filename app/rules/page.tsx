import type { Metadata } from "next";
import Link from "next/link";
import { ShieldIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "網站規範 | 選課報名系統"
};

/** 網站規範。純靜態內容，要改規則直接改這個檔案。 */
export default function RulesPage() {
  return (
    <div className="app-shell">
      <SiteHeader>
        <Link href="/" className="btn btn-ghost">
          回到畫廊
        </Link>
      </SiteHeader>

      <main className="app-container app-main">
        <article className="rules fade-up">
          <header className="rules__head">
            <div className="landing-hero__eyebrow">Rules</div>
            <h1 className="landing-hero__title">網站規範</h1>
            <p className="landing-hero__text">
              本站展示的作品都是同學們的原創，著作權屬於各自的作者。瀏覽或使用本站，即表示你同意以下規範。
            </p>
            <p className="rules__updated">最後更新：2026 年 9 月 28 日</p>
          </header>

          <section className="card rules__section rules__section--highlight">
            <h2 className="rules__title">
              <ShieldIcon aria-hidden="true" />
              一、作品使用
            </h2>
            <p className="rules__lead">以下行為一律禁止：</p>
            <ol className="rules__list">
              <li>
                <strong>用於 AI</strong>：將本站任何作品用於 AI 訓練、微調（例如 LoRA）、建立資料集，或作為生成式 AI 的輸入（以圖生圖、模仿畫風、風格轉換等）。
              </li>
              <li>
                <strong>轉載散布</strong>：未經作者本人同意，轉載、重新上傳、截圖散布，或放到其他網站、社群、群組。
              </li>
              <li>
                <strong>商業使用</strong>：販售、印製周邊、用於廣告或任何收費內容。
              </li>
              <li>
                <strong>去除署名</strong>：移除、裁切、遮蓋或修改圖片上的水印與作者署名。
              </li>
              <li>
                <strong>冒用作品</strong>：描圖、改圖、拼貼後宣稱是自己的作品。
              </li>
            </ol>
            <p className="rules__lead">可以做的事：</p>
            <ul className="rules__list">
              <li>在本站瀏覽作品。</li>
              <li>分享本站網址，或作者本人發布的原始貼文連結。</li>
              <li>想使用作品時，直接聯絡作者取得同意（作者名稱標在每件作品下方）。</li>
            </ul>
          </section>

          <section className="card rules__section">
            <h2 className="rules__title">二、使用本站</h2>
            <ol className="rules__list">
              <li>帳號僅限本人使用，不得借給他人或代替他人選課。</li>
              <li>禁止用程式、腳本或爬蟲大量存取本站，包括自動搶課與批次下載作品。</li>
              <li>不得嘗試干擾、攻擊本站，或繞過權限控管。</li>
            </ol>
          </section>

          <section className="card rules__section">
            <h2 className="rules__title">三、本站的防護措施</h2>
            <ul className="rules__list">
              <li>所有展示的圖片都已縮小，並壓上作者署名與「禁止 AI 學習」的浮水印；原始高解析檔案不會放在本站。</li>
              <li>影片作品直接嵌入作者在 YouTube 上的影片，本站不另外保存影片檔。</li>
              <li>透過 robots.txt、ai.txt 以及 noai、TDM 保留聲明，拒絕已知的 AI 爬蟲收集本站內容。</li>
              <li>
                這些措施只擋得住遵守規則的爬蟲，無法完全防止盜用。作者如果想進一步保護，可以在投稿前自行用 Glaze、Nightshade 等工具處理原圖。
              </li>
            </ul>
          </section>

          <section className="card rules__section">
            <h2 className="rules__title">四、下架與回報</h2>
            <ul className="rules__list">
              <li>作者想下架作品、修改署名或標題，請在校內 Discord 伺服器聯絡管理員。</li>
              <li>發現本站作品被違規使用，也請向管理員回報，並附上出處連結。</li>
              <li>違反本規範者，本站得停止其使用權限；作者保留依著作權法追究的權利。</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
