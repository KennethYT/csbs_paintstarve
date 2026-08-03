import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext 的 Cloudflare adapter 設定。
 *
 * 目前用預設值即可：這個專案所有頁面都是動態的（server component + API route），
 * 沒有需要 ISR/快取覆寫的地方，所以不必額外接 incremental cache 或 queue。
 */
export default defineCloudflareConfig();
