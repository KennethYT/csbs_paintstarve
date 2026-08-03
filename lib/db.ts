import { neonConfig, Pool } from "@neondatabase/serverless";
import { Kysely, PostgresDialect } from "kysely";

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

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

function createPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export const pool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

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
 * lib/course-service.ts 直接對 `pool` 下原生 SQL。
 *
 * Neon 的 `Pool` 在執行期跟 Kysely 需要的 node-postgres `Pool` 介面完全相容
 * （connect/query/release/options），但型別上多了一個不相容的 `Client` 靜態成員，
 * 所以這裡需要轉型。
 */
export const kyselyDb = new Kysely<AuthDatabase>({
  dialect: new PostgresDialect({
    pool: pool as unknown as ConstructorParameters<typeof PostgresDialect>[0]["pool"]
  })
});
