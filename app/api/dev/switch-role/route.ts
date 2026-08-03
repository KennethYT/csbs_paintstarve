import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/session";

/**
 * 開發用捷徑：不透過 Discord 身份組同步，直接切換目前登入者的 role。
 * 正式環境找不到這條路由（build 時就不會把這支 route 打進 Worker 之外，
 * 這裡再多一層執行期檢查保險）。
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "尚未登入。" }, { status: 401 });
  }

  const nextRole = user.role === "teacher" ? "student" : "teacher";

  await pool.query(`UPDATE "user" SET role = $1, "updatedAt" = now() WHERE id = $2`, [
    nextRole,
    user.id
  ]);

  return NextResponse.json({ ok: true, role: nextRole });
}
