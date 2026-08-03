# 選課搶課系統

大學選課／搶課系統。學生在開放時間瞬間搶有限名額、額滿自動排候補；教師開課、管理名單、看儀表板。

以 **Next.js 16（App Router）+ React 19 + TypeScript + PostgreSQL（Neon，原生 SQL）** 打造，登入使用 **better-auth**，身分一律由 Discord 伺服器的身份組自動辨識。

## 功能

**學生**
- 瀏覽課程，可依名稱／教師搜尋、依分類篩選
- 搶課；額滿時自動加入候補並顯示排序
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

打開 http://localhost:3000 ，按「使用 Discord 登入」。你的 Discord 帳號必須已經在
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
  page.tsx                      依登入身分導向對應入口
  login/                        登入頁（版面在 components/auth-hero.tsx）
  discord/complete/             Discord OAuth 回呼，伺服器端解析身份組後導向
  student/                      學生區（layout 做角色把關）
  teacher/                      教師區（layout 做角色把關）
  api/
    auth/[...all]/              better-auth
    courses/                    課程列表／建立
    courses/[courseId]/enroll/  搶課（POST）與退選（DELETE）
    courses/[courseId]/roster/  選課名單（僅授課教師）
lib/
  auth.ts  session.ts           認證設定與伺服器端 session helper
  course-service.ts             課程／選課的核心邏輯，含併發控制
  course-utils.ts               狀態判斷與格式化
  course-constants.ts           分類、星期、節次
components/
  classroom-store.tsx           前端狀態：首屏由伺服器帶入，之後輪詢更新
  role-shell.tsx                server component，角色把關 + 首屏資料
proxy.ts                        edge 層的 cookie 檢查（非授權依據）
```

### 搶課的併發正確性

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

這不是偏好問題，是被搶課邏輯逼出來的結論。`lib/course-service.ts` 用
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
3. 設定 Cloudflare 的機密（**不要**寫進 `wrangler.jsonc`）：
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put BETTER_AUTH_URL          # 正式網址
   wrangler secret put DISCORD_CLIENT_ID        # 其餘 DISCORD_* 同理
   ```
4. `pnpm preview` 先在本機的 workerd 跑過一遍，再 `pnpm deploy`

用 Cloudflare 的 Workers Builds（推 git 就自動部署）時：

| 設定 | 值 |
|---|---|
| Build command | `pnpm build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Build variables | `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL` |

> Deploy command 若維持預設的 `npx wrangler deploy`，wrangler 會判定專案沒設定好而觸發
> auto-config，自動跑一次 `@opennextjs/cloudflare migrate` 覆寫 `wrangler.jsonc`、
> `open-next.config.ts` 與 `package.json` scripts。那些改動只存在於 CI 的暫存 checkout，
> 每次建置都會重來一次。
>
> Build variables 要設，是因為 `/login` 是靜態預產生頁面，建置階段就會初始化 better-auth；
> 缺 `BETTER_AUTH_SECRET` 時它會丟 `You are using the default secret`。

最後把 `<你的網址>/api/auth/callback/discord` 加進 Discord 應用程式的 OAuth2 Redirect URI，
否則登入會失敗。
