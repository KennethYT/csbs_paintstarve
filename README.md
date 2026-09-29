# 暑期選修作品畫廊

暑期選修課程的同學作品畫廊（公開首頁）。用 Discord 登入後可以投稿圖片／連結到畫廊。
原本的選課／報名系統（學生在開放時間瞬間搶有限名額、額滿自動排候補；教師開課、管理名單、看儀表板）目前已關閉。

> **開關**都在 `lib/course-constants.ts`：
>
> - `COURSE_SYSTEM_ENABLED`（目前 `false`）：選課系統。關閉時 `/student`、`/teacher` 一律導回首頁，
>   選課 API 一律回 404，已登入的人也進不去。程式與資料庫都保留，改回 `true` 就恢復原狀。
> - `GALLERY_SUBMISSION_ENABLED`（目前 `true`）：畫廊投稿，見下方「畫廊投稿」。
> - 兩個都關掉時 `/login` 與登入 API（`/api/auth`）也跟著關閉，網站只剩畫廊與網站規範。
>
> 以下關於選課的說明，都是選課系統開著時的行為。

以 **Next.js 16（App Router）+ React 19 + TypeScript + PostgreSQL（Neon，原生 SQL）** 打造，登入使用 **better-auth**，身分一律由 Discord 伺服器的身份組自動辨識。

## 功能

**首頁**
- 公開的作品畫廊，不需要登入；右上角依登入狀態顯示「登入投稿」或「投稿作品」（管理員另有「管理投稿」）
- 點作品開燈箱放大，多頁作品（漫畫、課堂筆記）可用左右鍵、按鈕或手機滑動翻頁
- 圖片壓有作者署名與「禁止 AI 學習」水印，並拒絕 AI 爬蟲；網站規範在 `/rules`

**畫廊投稿**
- 登入後在 `/submit` 上傳圖片（最多 20 張，多頁依序翻）或貼 YouTube 連結，可附標題、說明、作者連結與相關連結
- 圖片在瀏覽器端就縮圖、鋪白底、壓上跟既有作品一樣的水印，再上傳到 Cloudflare R2
- 送出後立即公開、不需審核；只有管理員（`lib/gallery-admins.ts` 清單裡的 Discord 帳號）可以在 `/manage` 下架／恢復

**學生**
- 瀏覽課程，可依名稱／教師搜尋、依分類篩選
- 報名；額滿時自動加入候補並顯示排序
- 我的課表：週課表格線 + 已選清單，可退選／取消候補
- 名額變動每 4 秒自動更新，開搶倒數即時計時

**教師**
- 建立課程（分類、時段、地點、名額、開放時間）
- 查看每門課的選課名單與候補名單
- 儀表板：總課程數、選課人次、候補人數、平均額滿率、熱門課程排行

**登入**
- 只有 Discord 一種登入方式，不開放自行註冊帳號
- 機器人檢查使用者在指定伺服器的身份組，據此指派學生或教師角色
- 沒有對應身份組的人登入會被擋下，並提示聯絡管理員

## 開始開發

需要 Node.js 20+、pnpm、一個 PostgreSQL 資料庫，以及一組可用的 Discord 應用程式與機器人
（因為 Discord 是唯一的登入方式，沒有它就無法登入系統）。

```bash
pnpm install
cp .env.example .env      # 填入 DATABASE_URL、BETTER_AUTH_SECRET 與 DISCORD_*
pnpm db:push              # 建立資料表
pnpm db:seed              # 匯入 7 門示範課程與選課紀錄
pnpm dev
```

打開 http://localhost:3000 會先看到作品畫廊。選課系統開著時，按右上角「登入」再按「使用 Discord 登入」。你的 Discord 帳號必須已經在
`DISCORD_GUILD_ID` 指定的伺服器裡，並持有 `DISCORD_TEACHER_ROLE_ID` 或
`DISCORD_STUDENT_ROLE_ID` 其中一個身份組，否則會被擋在登入頁。

> `pnpm db:seed` 建立的示範帳號（`teacher1@example.edu`、`student1@example.edu` …）**無法登入**，
> 它們沒有綁定 Discord 帳號，只是用來讓課程有真實的選課人數與候補名單。

### 指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 開發伺服器（Next.js，Node runtime） |
| `pnpm build` | 正式版建置（Next.js build，接著由 OpenNext 打包成 Worker） |
| `pnpm preview` | 用真正的 workerd runtime 在本機跑 Worker，部署前的主要驗證手段 |
| `pnpm deploy` | 部署到 Cloudflare Workers |
| `pnpm build:next` | 只跑 Next.js 建置，不打包 Worker（除錯用） |
| `pnpm lint` | ESLint |
| `pnpm db:push` | 執行 `lib/sql/schema.sql`，把 schema 同步到資料庫 |
| `pnpm db:seed` | 重建示範課程資料（會清空既有課程與選課） |

### 環境變數

見 `.env.example`，全部都是必填。`DISCORD_*` 沒設定的話登入按鈕會失效，而且沒有其他登入方式，
等於整個系統無法使用。

## 架構

```
app/
  page.tsx                      公開首頁：投稿作品 + 既有作品的畫廊，右上角依登入狀態顯示入口
  submit/                       投稿頁（登入後）：投稿表單 + 我的投稿
  manage/                       管理投稿（僅管理員）：下架／恢復
  uploads/[id]/[file]/          投稿圖檔，從 R2 讀出並附上 noai 標頭
  rules/                        網站規範（純靜態，要改規則直接改這頁）
  robots.txt/route.ts           robots.txt：拒絕 AI 爬蟲與圖片搜尋爬蟲，附中英文禁止 AI 聲明
  login/                        登入頁（版面在 components/auth-hero.tsx）
  discord/complete/             Discord OAuth 回呼，伺服器端解析身份組後導向
  student/                      學生區（layout 做角色把關）
  teacher/                      教師區（layout 做角色把關）
  api/
    auth/[...all]/              better-auth
    courses/                    課程列表／建立
    courses/[courseId]/enroll/  報名（POST）與退選（DELETE）
    courses/[courseId]/roster/  選課名單（僅授課教師）
    gallery/submissions/        投稿（POST）；[id] 管理員下架／恢復（PATCH）
lib/
  auth.ts  session.ts           認證設定與伺服器端 session helper
  course-service.ts             課程／選課的核心邏輯，含併發控制
  course-utils.ts               狀態判斷與格式化
  course-constants.ts           分類、星期、節次
  roles.ts                      各身分的入口網址、畫廊管理員判斷（client / server 共用）
  gallery.ts                    既有作品清單（public/gallery）
  gallery-submissions.ts        投稿的建立、列表、下架／恢復
  gallery-constants.ts          投稿限制、YouTube／網址解析（client / server 共用）
  watermark.ts                  瀏覽器端縮圖＋壓水印
  r2.ts                         R2 bucket 存取
components/
  classroom-store.tsx           前端狀態：首屏由伺服器帶入，之後輪詢更新
  role-shell.tsx                server component，角色把關 + 首屏資料
  gallery.tsx                   畫廊格線 + 燈箱
  site-header.tsx               公開頁面（首頁、規範、投稿）的頁首
  submission-form.tsx           投稿表單
  submission-list.tsx           我的投稿／管理投稿清單
public/gallery/                 畫廊圖片（已縮好、壓好水印的 webp，大圖 + 縮圖）
public/_headers                 Cloudflare 靜態檔的回應標頭（圖檔的 noai 標記）
public/ai.txt                   Spawning ai.txt，拒絕 AI 訓練
proxy.ts                        edge 層的 cookie 檢查（非授權依據）
```

### 畫廊

作品清單在 `lib/gallery.ts`，一件作品可以有多張圖（第一張當封面，燈箱裡依序翻頁）。
圖片放 `public/gallery/`，每張要準備兩個檔：

| 檔名 | 用途 | 建議尺寸 |
|---|---|---|
| `<名稱>.webp` | 燈箱大圖 | 長寬不超過 1600×2000 |
| `<名稱>-thumb.webp` | 格線縮圖 | 寬 640px |

**一定要先縮好再放進來。** 部署到 Workers 後沒有 Cloudflare Images（`IMAGES` binding），
`/_next/image` 不會真的壓縮，只會把原圖原封不動傳回去，所以畫廊元件一律用 `unoptimized`
直接讀 `public/` 的檔案。清單裡的 `width`／`height` 填大圖的實際像素（格線靠它預留版面），
`color` 填圖片主色（載入前的底色）。透明背景的線稿請先鋪白底，否則在深色頁面上會看不見。

影片作品（例如 YouTube Shorts）在作品上加 `youtube: "<影片 ID>"`，封面放 `cover`（同樣要壓水印）、`images` 可以留空；
燈箱第一頁會嵌 YouTube 官方播放器（`youtube-nocookie.com`），影片檔不存在本站。

### 畫廊投稿

登入後在 `/submit` 投稿，首頁會把「投稿作品（新的在前）」接在 `lib/gallery.ts` 的既有作品前面。

- **圖片處理在瀏覽器端**：Workers 上跑不了 sharp，所以 `lib/watermark.ts` 用 canvas 縮圖（大圖 1600×2000、縮圖寬 640）、
  鋪白底、壓上跟既有作品一樣的水印後才上傳。水印用的是表單裡的「作者署名」。動圖只保留第一格。
- **伺服器端**：`app/api/gallery/submissions` 檢查登入、欄位與檔頭（只收 WebP／JPEG／PNG），每人 24 小時最多 10 件，
  圖檔存進 R2 的 `submissions/<id>/`，資料寫進 `GallerySubmission` 表。
- **連結**：YouTube 連結可以不附圖（封面用 YouTube 縮圖、燈箱嵌播放器）；其他連結（推特、雲端等）只當「相關連結」，
  該投稿至少要有一張圖。
- **不審核、立即公開**；只有管理員（`lib/gallery-admins.ts` 的 `GALLERY_ADMIN_DISCORD_IDS`，以 Discord 使用者 ID 認人，跟身份組無關）
  能在 `/manage` 下架。下架時 R2 圖檔搬到 `removed/<id>/`、`/uploads` 就讀不到，恢復時再搬回來。
  投稿者本人不能自己刪除，要下架請找管理員（網站規範也這樣寫）。

**第一次啟用前要做的事**：

```bash
npx wrangler r2 bucket create csbs-paintstarve-gallery   # 建立 R2 bucket（名稱對應 wrangler.jsonc）
pnpm db:push                                             # 建立 GallerySubmission 表
```

> `pnpm db:push` 跑的是整份 `lib/sql/schema.sql`，除了建表之外也會照舊把所有課程的 `openAt`／`capacity`
> 校正成全站統一值（檔案裡原本就有的行為）。
>
> 本機 `pnpm dev` 不需要真的 bucket：OpenNext 會用 wrangler 在本機模擬 R2，檔案存在 `.wrangler/state`。

### 防止 AI 盜用

| 措施 | 在哪裡 |
|---|---|
| 水印直接壓進圖檔（大圖與縮圖都有）：滿版淡斜紋「@作者 · NO AI TRAINING · 禁止 AI 學習」+ 右下角「© @作者 · 禁止 AI 學習／轉載」 | `public/gallery/*.webp` |
| robots.txt 整站拒絕 GPTBot、ClaudeBot、CCBot、Google-Extended 等 AI 爬蟲與圖片搜尋爬蟲；一般搜尋引擎不收錄圖檔 | `app/robots.txt/route.ts` |
| `noai, noimageai` 與 `tdm-reservation`：頁面用 meta，圖檔用回應標頭 | `app/layout.tsx`、`public/_headers` |
| Spawning ai.txt | `public/ai.txt` |
| 圖片擋右鍵、拖曳與 iOS 長按另存 | `components/gallery.tsx`、`globals.css` |

**新增圖片時水印要自己先壓好**，網頁上不會另外疊。這些措施都只擋得住守規矩的爬蟲與一般使用者，
截圖或刻意移除水印仍然擋不住；需要更強保護的作者可以在投稿前自行用 Glaze／Nightshade 處理原圖。

> `public/_headers` 只在部署到 Cloudflare 後生效（`pnpm preview` 可以驗證），`pnpm dev` 看不到這些標頭。

### 報名的併發正確性

開搶瞬間會有大量請求同時打同一堂課，必須保證**不超賣**。作法是在交易一開始對該課程取得
Postgres 的 transaction-level advisory lock：

```ts
await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [courseId]);
```

取得鎖之後才去數目前已選人數、決定要給正取還是候補，因此讀到的數字不可能在寫入前被別人改掉。
鎖隨交易結束自動釋放，不同課程之間互不影響。

> 一開始是用 `Serializable` 隔離等級加重試，但那個做法在高競爭下會讓 Postgres 中止大量交易
> （serialization_failure）：實測 20 人搶 5 個名額時，重試 5 次仍有 4 個請求失敗。
> advisory lock 是排隊而非互相中止，50 人搶 3 個名額也全數正確回應。

資料表上另有 `UNIQUE ("courseId", "userId")`，作為重複選課的最後防線。

退選在同一把鎖底下完成：刪除該筆選課後，若釋出的是正取名額，候補第一位會自動遞補，
其餘候補的排序號碼重新排成連續的 1、2、3……

### 權限

兩層：

1. `app/student/layout.tsx`、`app/teacher/layout.tsx` — 經由 `components/role-shell.tsx`
   用 `requireRole()` 做權威把關，關掉 JS 也繞不過
2. 每個 API route 各自驗證 session 與角色

> 早期還有第三層：`proxy.ts` 在 edge 檢查 session cookie 是否存在。
> 那只是效能優化、從來不是授權依據，而 `@opennextjs/cloudflare` 目前不支援
> Next.js 16 的 Node.js runtime middleware（`proxy.ts` 無法改用 Edge runtime），
> 所以搬到 Workers 時直接移除。未登入者現在由 `requireRole()` 導回 `/login`，
> 使用者看到的結果相同，只是多一次 server render。

使用者的 `role` 在 better-auth 設為 `input: false`，全專案只有 Discord 身份組解析
（`lib/discord.ts`）會寫入它，使用者無法透過 update-user 端點自行把自己改成教師。

選課名單不會隨課程列表送到瀏覽器，只有授課教師能透過 `/api/courses/[courseId]/roster` 取得。

## 部署（Cloudflare Workers）

透過 [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) 把 Next.js 打包成 Worker。
設定檔是 `wrangler.jsonc` 與 `open-next.config.ts`。

### 資料庫必須是 Neon，而且要用 direct endpoint

這不是偏好問題，是被報名邏輯逼出來的結論。`lib/course-service.ts` 用
`pg_advisory_xact_lock` 搭配 interactive transaction 保證不超賣，而在 Workers 上：

- **Cloudflare Hyperdrive 不支援 advisory lock**，而且它是 transaction-mode pooler，
  官方文件本身就警告不要用長交易維持狀態 → 不能用
- **Neon 的 HTTP driver 不支援 interactive transaction** → 不能用
- **Neon 的 WebSocket driver（`Pool`）** 提供完整的 pg 連線語意 —— session state、
  advisory lock、`BEGIN`/`COMMIT` 全部成立 → **這是唯一可行的選項**

因此 `lib/db.ts` 直接用 `@neondatabase/serverless` 的 `Pool`（WebSocket 版，不是 `neon()` 的
HTTP 版），`DATABASE_URL` 請填 Neon 的 **direct** endpoint，**不要**用 `-pooler` 那條 ——
pooler 是 transaction-mode 的 PgBouncer，會讓 advisory lock 的行為變得不可靠。

> **已知取捨**：沒有 pooler，Neon compute 的最大連線數就是併發上限。開搶尖峰時
> 每個排隊中的請求各佔一條連線數秒，有可能觸頂。若實測撐不住，正統的 Workers 解法是把
> 「同一堂課的序列化」交給 Durable Object（一課一個 DO，天生序列化），DB 只負責寫入。
> 那是一次大改，目前尚未進行。

### 步驟

1. 建立 Neon 專案，取得 direct endpoint 連線字串
2. 本機 `pnpm db:push && pnpm db:seed` 建表與匯入示範資料
3. 建立畫廊投稿用的 R2 bucket：`npx wrangler r2 bucket create csbs-paintstarve-gallery`
4. 設定 Cloudflare 的機密（**不要**寫進 `wrangler.jsonc`）：
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put BETTER_AUTH_URL          # 正式網址
   wrangler secret put DISCORD_CLIENT_ID        # 其餘 DISCORD_* 同理
   ```
5. `pnpm preview` 先在本機的 workerd 跑過一遍，再 `pnpm deploy`

用 Cloudflare 的 Workers Builds（推 git 就自動部署）時：

| 設定 | 值 |
|---|---|
| Build command | `pnpm build:worker` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Build variables | `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL` |

> Build command 一定要是 `pnpm build:worker`（=`opennextjs-cloudflare build`），不能只是
> `pnpm build`（=`next build`）。`opennextjs-cloudflare deploy` 只會讀取已經編譯好的
> OpenNext 產物（`.open-next/`），它自己不會觸發建置；只跑 `next build` 不會產生
> `.open-next/`，deploy 階段就會報「Could not find compiled Open Next config」。
> `build:worker` 內部會自動先跑一次 `next build` 再做 OpenNext 轉換，一個指令就夠了。
>
> Deploy command 若維持預設的 `npx wrangler deploy`，wrangler 會判定專案沒設定好而觸發
> auto-config，自動跑一次 `@opennextjs/cloudflare migrate` 覆寫 `wrangler.jsonc`、
> `open-next.config.ts` 與 `package.json` scripts。那些改動只存在於 CI 的暫存 checkout，
> 每次建置都會重來一次。
>
> Build variables 要設，是因為 `/login` 是靜態預產生頁面，建置階段就會初始化 better-auth；
> 缺 `BETTER_AUTH_SECRET` 時它會丟 `You are using the default secret`；`BETTER_AUTH_URL`
> 要帶完整協定（`https://...`），只填網域會丟 `Invalid base URL`。

最後把 `<你的網址>/api/auth/callback/discord` 加進 Discord 應用程式的 OAuth2 Redirect URI，
否則登入會失敗。
