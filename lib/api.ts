import { NextResponse } from "next/server";
import { COURSE_SYSTEM_ENABLED, GALLERY_SUBMISSION_ENABLED, LOGIN_ENABLED } from "@/lib/course-constants";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

/** 選課系統關閉時（見 COURSE_SYSTEM_ENABLED），選課與登入 API 一律回 404；開著時回傳 null。 */
export function courseSystemClosed() {
  return COURSE_SYSTEM_ENABLED ? null : jsonError("選課系統已關閉。", 404);
}

/** 登入沒開放時（選課系統與畫廊投稿都關閉），登入相關 API 一律回 404；開著時回傳 null。 */
export function loginClosed() {
  return LOGIN_ENABLED ? null : jsonError("目前不開放登入。", 404);
}

/** 畫廊投稿關閉時，投稿與管理 API 一律回 404；開著時回傳 null。 */
export function gallerySubmissionClosed() {
  return GALLERY_SUBMISSION_ENABLED ? null : jsonError("目前不開放投稿。", 404);
}

export function jsonOk<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status });
}

/** 安全地解析 request body，格式錯誤時回傳 null 而非丟出例外。 */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
