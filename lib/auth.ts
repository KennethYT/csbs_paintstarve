import { betterAuth } from "better-auth";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { nextCookies } from "better-auth/next-js";
import { kyselyDb } from "@/lib/db";

/**
 * Discord 是唯一的登入方式。其他 OAuth 供應商不註冊 —— 它們無法解析校內身份組，
 * 登入後只會產生沒有 role、進不了任何頁面的帳號。
 */
const socialProviders =
  process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET
        }
      }
    : {};

export const auth = betterAuth({
  database: kyselyAdapter(kyselyDb, { type: "postgres" }),
  // 身分一律由 Discord 伺服器的身份組決定，不開放 Email/密碼註冊登入
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        // 角色只能由 Discord 身份組解析寫入（見 lib/discord.ts）。
        // 設為 false 可阻止使用者透過 update-user 端點自行把自己改成 teacher。
        input: false
      }
    }
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  // 讓 server action / route handler 能正確寫入 session cookie
  plugins: [nextCookies()]
});

export type AppSession = typeof auth.$Infer.Session;
