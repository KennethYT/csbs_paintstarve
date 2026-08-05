import { betterAuth } from "better-auth";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { nextCookies } from "better-auth/next-js";
import { cache } from "react";
import { getKyselyDb } from "@/lib/db";

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

/**
 * betterAuth() 本身只是組設定、不做 I/O，但底下的 kyselyAdapter 綁的是
 * getKyselyDb()（每個請求各自一份連線，見 lib/db.ts）。如果 `auth` 是模組層級
 * 建一次的單例，就會永遠綁死在第一次呼叫當下那個請求的連線物件上，之後每個
 * 請求都會撞到「用了別的請求開的連線」而被 Workers 砍斷。所以這裡也包一層
 * cache()，跟著請求範圍重新組一份。
 */
export const getAuth = cache(function getAuth() {
  return betterAuth({
    database: kyselyAdapter(getKyselyDb(), { type: "postgres" }),
    // 身分一律由 Discord 伺服器的身份組決定，不開放 Email/密碼註冊登入
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          // 角色只能由 Discord 身份組解析寫入（見 lib/discord.ts）。
          // 設為 false 可阻止使用者透過 update-user 端點自行把自己改成 teacher。
          input: false
        },
        canSwitchRole: {
          type: "boolean",
          required: false,
          // 同上，只能由 lib/discord.ts 寫入，使用者不能自己把這個打開。
          input: false
        }
      }
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    // 讓 server action / route handler 能正確寫入 session cookie
    plugins: [nextCookies()]
  });
});

export type AppSession = ReturnType<typeof getAuth>["$Infer"]["Session"];
