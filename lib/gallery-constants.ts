/**
 * 畫廊投稿的限制與連結解析。投稿表單（client）跟 API（server）共用，
 * 最後以 server 端的檢查為準（見 lib/gallery-submissions.ts）。
 */

export const SUBMISSION_LIMITS = {
  titleMax: 60,
  artistNameMax: 60,
  descriptionMax: 300,
  urlMax: 500,
  maxImages: 20,
  maxLinks: 5,
  /** 每人 24 小時內最多投稿幾件 */
  perDay: 10,
  /** 瀏覽器端處理前的原始檔上限 */
  inputFileMaxBytes: 40 * 1024 * 1024,
  /** 處理後上傳的大圖／縮圖上限（server 端檢查） */
  fullMaxBytes: 4 * 1024 * 1024,
  thumbMaxBytes: 800 * 1024,
  /** 大圖最大尺寸，跟 public/gallery 的既有作品一致 */
  fullMaxWidth: 1600,
  fullMaxHeight: 2000,
  thumbWidth: 640
} as const;

/** 上傳檔案允許的格式。瀏覽器不支援輸出 webp 時（舊版 Safari）會退回 jpeg。 */
export const SUBMISSION_IMAGE_TYPES = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png"
} as const;

export type SubmissionImageType = keyof typeof SUBMISSION_IMAGE_TYPES;

/** 只接受 http(s) 網址，其他（javascript:、data: 等）一律當成無效。 */
export function parseHttpUrl(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length > SUBMISSION_LIMITS.urlMax) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** 從各種 YouTube 網址（watch、youtu.be、shorts、embed、live）取出 11 碼影片 ID。 */
export function parseYoutubeId(input: string): string | null {
  const url = parseHttpUrl(input);

  if (!url) {
    return null;
  }

  const { hostname, pathname, searchParams } = new URL(url);
  const host = hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = pathname === "/watch" ? searchParams.get("v") : (/^\/(?:shorts|embed|live)\/([^/]+)/.exec(pathname)?.[1] ?? null);
  }

  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** 燈箱裡「相關連結」顯示的名稱。 */
export function linkLabel(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");

  if (host === "x.com" || host === "twitter.com") return "X（推特）";
  if (host === "drive.google.com") return "Google 雲端";
  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") return "YouTube";
  if (host === "instagram.com") return "Instagram";
  if (host === "pixiv.net") return "pixiv";

  return host;
}
