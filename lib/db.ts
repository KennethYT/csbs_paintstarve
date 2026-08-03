import { neonConfig, Pool } from "@neondatabase/serverless";
import { Kysely, PostgresDialect } from "kysely";
import { cache } from "react";

/**
 * Cloudflare Workers 沒有 TCP socket，所以連線走 Neon 的 serverless driver。
 *
 * 這裡刻意用 `Pool`（WebSocket 模式）而不是 `neon()`（HTTP 模式）：
 * HTTP 模式不支援 interactive transaction，而 lib/course-service.ts 的搶課邏輯
 * 依賴 `pg_advisory_xact_lock` 搭配交易中的多個指令來保證不超賣。
 * WebSocket 模式給的是完整的 pg 連線語意（session state、advisory lock、
 * BEGIN/COMMIT），是唯一能原封不動保留那套併發設計的選項。
 *
 * 連線字串請用 Neon 的 direct endpoint，不要用 `-pooler` 那條 —— pooler 是
 * transaction-mode 的 PgBouncer，會讓 advisory lock 的行為變得不可靠。
 */
if (process.env.NEON_WS_PROXY) {
  // 本機開發：讓 Neon driver 透過 WebSocket proxy 連到本機 Postgres，
  // 這樣本機跑的就是與正式環境同一條 driver 程式碼路徑。
  neonConfig.wsProxy = process.env.NEON_WS_PROXY;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  neonConfig.pipelineTLS = false;
}

/**
 * Cloudflare Workers 不允許一個請求開的連線／stream 被另一個請求拿去用 ——
 * 實測會直接丟 "Cannot perform I/O on behalf of a different request"，
 * 把整個 Worker 搞當掉。以前用 globalThis 快取一份 Pool 給多個請求共用，
 * 在本機 Node server 沒事，但部署到 Workers 後，同一個 warm isolate
 * 處理下一個請求時會重用到上一個請求開的 WebSocket 連線，直接被砍斷。
 *
 * 改用 React 的 cache()：Next.js 對每個進來的請求（無論最後是 Server
 * Component render 還是 Route Handler）都有各自獨立的請求範圍，cache()
 * 包起來的函式在同一個請求內重複呼叫會拿到同一個實例（同請求內多次查詢仍然
 * 共用一條連線），但換一個請求一定會重新呼叫、建立全新的 Pool，不會有連線
 * 物件跨請求殘留的問題。在 render/請求範圍之外呼叫（例如 scripts/seed.ts
 * 這種一次性 Node 腳本）cache() 就是單純直接執行，行為等同沒有快取。
 */
export const getPool = cache(function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
});

/** better-auth 專用的表結構，只涵蓋 kyselyAdapter 需要管理的 4 張表。 */
interface AuthDatabase {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  account: {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    scope: string | null;
    password: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
  };
  verification: {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * 只給 better-auth 的 kyselyAdapter 用。`Course`/`Enrollment` 不在這裡管理，
 * lib/course-service.ts 直接對 `getPool()` 下原生 SQL。
 *
 * 跟 getPool() 一樣包 cache()：同一個請求內共用同一個 Kysely 實例，不同請求
 * 一定重新建立，理由同上（避免底下的連線物件跨請求殘留）。
 *
 * Neon 的 `Pool` 在執行期跟 Kysely 需要的 node-postgres `Pool` 介面完全相容
 * （connect/query/release/options），但型別上多了一個不相容的 `Client` 靜態成員，
 * 所以這裡需要轉型。
 */
export const getKyselyDb = cache(function getKyselyDb() {
  return new Kysely<AuthDatabase>({
    dialect: new PostgresDialect({
      pool: getPool() as unknown as ConstructorParameters<typeof PostgresDialect>[0]["pool"]
    })
  });
});
