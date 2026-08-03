import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
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
