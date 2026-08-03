import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// 不能在模組層級呼叫 toNextJsHandler(getAuth())：那樣只會在第一個請求時組一次
// handler，之後每個請求都沿用同一份、綁死同一個請求的 DB 連線物件，在
// Cloudflare Workers 上會被判定成跨請求重用 I/O 而砍斷。改成每個請求進來時
// 才呼叫 getAuth()，讓 lib/db.ts 的 cache() 給這次請求一份新的連線。
export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}