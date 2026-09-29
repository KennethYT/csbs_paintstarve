import { cache } from "react";
import { getPool } from "@/lib/db";

/**
 * 畫廊管理員（可以在 /manage 下架／恢復投稿）的 Discord 使用者 ID。
 * Discord ID 不是機密，直接寫在這裡；要增減管理員就改這個清單。
 */
export const GALLERY_ADMIN_DISCORD_IDS: readonly string[] = ["579378642958942227", "293018629144838145"];

/**
 * 依登入者綁定的 Discord 帳號判斷是否為畫廊管理員，跟學生／教師身份組無關。
 * Discord 使用者 ID 存在 better-auth 的 account 表（providerId = 'discord' 的 accountId），
 * 跟 lib/discord.ts 查身份組用的是同一個欄位。包 cache()：同一個請求內只查一次。
 */
export const isGalleryAdmin = cache(async function isGalleryAdmin(userId: string) {
  const { rows } = await getPool().query<{ accountId: string }>(
    `SELECT "accountId" FROM account WHERE "userId" = $1 AND "providerId" = 'discord'`,
    [userId]
  );

  return rows.some((row) => GALLERY_ADMIN_DISCORD_IDS.includes(row.accountId));
});
