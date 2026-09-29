import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import type { GalleryImage, GalleryWork } from "@/lib/gallery";
import {
  parseHttpUrl,
  parseYoutubeId,
  SUBMISSION_IMAGE_TYPES,
  SUBMISSION_LIMITS,
  type SubmissionImageType
} from "@/lib/gallery-constants";
import { getGalleryBucket, moveR2Prefix, type GalleryR2Bucket } from "@/lib/r2";

/**
 * 畫廊投稿：登入後從 /submit 上傳的作品。
 *
 * - 圖片在瀏覽器端就縮好、壓好水印（lib/watermark.ts），這裡只檢查格式與大小後存進 R2
 * - 送出後立即公開，不需要審核；只有管理員（lib/gallery-admins.ts）可以下架／恢復
 * - 下架時把 R2 的 submissions/<id>/ 搬到 removed/<id>/，/uploads 就讀不到了；恢復時搬回來
 */

export type SubmissionStatus = "published" | "removed";

type StoredImage = { file: string; thumb: string; width: number; height: number; color: string };

type SubmissionRow = {
  id: string;
  userId: string;
  title: string | null;
  artistName: string;
  artistUrl: string | null;
  description: string | null;
  youtubeId: string | null;
  links: string[];
  images: StoredImage[];
  status: SubmissionStatus;
  createdAt: Date;
};

export type SubmissionSummary = {
  id: string;
  title: string | null;
  artistName: string;
  status: SubmissionStatus;
  /** 台灣時間 "YYYY/MM/DD HH:mm"，在伺服器組好，避免 SSR 與瀏覽器的 Intl 輸出不同造成 hydration 錯誤 */
  createdAtLabel: string;
  imageCount: number;
  youtubeId: string | null;
  cover: GalleryImage;
  uploaderName: string;
};

export class SubmissionError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const PUBLIC_PREFIX = "submissions/";
const REMOVED_PREFIX = "removed/";
const SUBMISSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isSubmissionId(id: string) {
  return SUBMISSION_ID.test(id);
}

function toGalleryImage(id: string, image: StoredImage): GalleryImage {
  return {
    src: `/uploads/${id}/${image.file}`,
    thumb: `/uploads/${id}/${image.thumb}`,
    width: image.width,
    height: image.height,
    color: image.color
  };
}

/** 純影片投稿沒有圖，封面直接用 YouTube 的縮圖（影片本身就在 YouTube 上，不另存）。 */
function youtubeCover(youtubeId: string): GalleryImage {
  const src = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  return { src, thumb: src, width: 480, height: 360, color: "#111111" };
}

function coverOf(row: Pick<SubmissionRow, "id" | "images" | "youtubeId">): GalleryImage {
  return row.images[0] ? toGalleryImage(row.id, row.images[0]) : youtubeCover(row.youtubeId ?? "");
}

function toGalleryWork(row: SubmissionRow): GalleryWork {
  return {
    id: `submission-${row.id}`,
    ...(row.title ? { title: row.title } : {}),
    artists: [row.artistUrl ? { name: row.artistName, url: row.artistUrl } : { name: row.artistName }],
    ...(row.description ? { description: row.description } : {}),
    ...(row.youtubeId ? { youtube: row.youtubeId, cover: coverOf(row) } : {}),
    ...(row.links.length ? { links: row.links } : {}),
    images: row.images.map((image) => toGalleryImage(row.id, image))
  };
}

/** 首頁用：所有公開中的投稿，新的在前。 */
export async function listPublishedWorks(): Promise<GalleryWork[]> {
  const { rows } = await getPool().query<SubmissionRow>(
    `SELECT id, "userId", title, "artistName", "artistUrl", description, "youtubeId", links, images, status, "createdAt"
     FROM "GallerySubmission"
     WHERE status = 'published'
     ORDER BY "createdAt" DESC
     LIMIT 500`
  );

  return rows.map(toGalleryWork);
}

/** 台灣沒有日光節約時間，固定 +8 小時後用 UTC 欄位組字串，不依賴伺服器時區或 Intl。 */
function formatTaipeiTime(date: Date) {
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${taipei.getUTCFullYear()}/${pad(taipei.getUTCMonth() + 1)}/${pad(taipei.getUTCDate())} ${pad(taipei.getUTCHours())}:${pad(taipei.getUTCMinutes())}`;
}

/** /submit 的「我的投稿」與 /manage 的全部投稿。 */
export async function listSubmissions(scope: { userId: string } | "all"): Promise<SubmissionSummary[]> {
  const byUser = scope !== "all";
  const { rows } = await getPool().query<SubmissionRow & { uploaderName: string }>(
    `SELECT s.id, s.title, s."artistName", s."youtubeId", s.images, s.status, s."createdAt", u.name AS "uploaderName"
     FROM "GallerySubmission" s
     JOIN "user" u ON u.id = s."userId"
     ${byUser ? `WHERE s."userId" = $1` : ""}
     ORDER BY s."createdAt" DESC
     LIMIT 500`,
    byUser ? [scope.userId] : []
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    artistName: row.artistName,
    status: row.status,
    createdAtLabel: formatTaipeiTime(row.createdAt),
    imageCount: row.images.length,
    youtubeId: row.youtubeId,
    cover: coverOf(row),
    uploaderName: row.uploaderName
  }));
}

// ---- 建立投稿 ------------------------------------------------------------------

type UploadedImage = { full: File; thumb: File; type: SubmissionImageType; width: number; height: number; color: string };

type SubmissionInput = {
  title: string | null;
  artistName: string;
  artistUrl: string | null;
  description: string | null;
  youtubeId: string | null;
  links: string[];
  images: UploadedImage[];
};

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** 看檔頭確認真的是圖片，不信任瀏覽器給的 Content-Type（避免把 HTML 之類的檔案放上本站網域）。 */
async function sniffImageType(file: File): Promise<SubmissionImageType | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));

  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";

  return null;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isDimension(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max;
}

/**
 * 解析 /api/gallery/submissions 的 multipart 表單。
 * 欄位：title、artistName、artistUrl、description、youtube、links（JSON 陣列）、agree、
 * imageMeta（JSON：[{ width, height, color }]），以及每張圖的 full-<n> / thumb-<n> 兩個檔案。
 */
async function parseSubmission(form: FormData): Promise<SubmissionInput> {
  const limits = SUBMISSION_LIMITS;
  const fail = (message: string): never => {
    throw new SubmissionError(message, 400);
  };

  if (text(form, "agree") !== "1") fail("請先勾選同意網站規範。");

  const title = text(form, "title");
  const artistName = text(form, "artistName");
  const description = text(form, "description");

  if (title.length > limits.titleMax) fail(`標題最多 ${limits.titleMax} 個字。`);
  if (!artistName) fail("請填寫作者署名。");
  if (artistName.length > limits.artistNameMax) fail(`作者署名最多 ${limits.artistNameMax} 個字。`);
  if (description.length > limits.descriptionMax) fail(`作品說明最多 ${limits.descriptionMax} 個字。`);

  const artistUrlInput = text(form, "artistUrl");
  const artistUrl = artistUrlInput ? parseHttpUrl(artistUrlInput) : null;
  if (artistUrlInput && !artistUrl) fail("作者連結必須是 http(s) 開頭的網址。");

  const youtubeInput = text(form, "youtube");
  const youtubeId = youtubeInput ? parseYoutubeId(youtubeInput) : null;
  if (youtubeInput && !youtubeId) fail("看不懂這個 YouTube 連結，請貼影片或 Shorts 的網址。");

  let rawLinks: unknown = [];
  try {
    rawLinks = JSON.parse(text(form, "links") || "[]");
  } catch {
    fail("相關連結格式錯誤。");
  }
  if (!Array.isArray(rawLinks) || rawLinks.length > limits.maxLinks) fail(`相關連結最多 ${limits.maxLinks} 個。`);
  const links = (rawLinks as unknown[]).map((link) => {
    const url = typeof link === "string" ? parseHttpUrl(link) : null;
    return url ?? fail("相關連結必須是 http(s) 開頭的網址。");
  });

  let meta: unknown = [];
  try {
    meta = JSON.parse(text(form, "imageMeta") || "[]");
  } catch {
    fail("圖片資料格式錯誤。");
  }
  if (!Array.isArray(meta) || meta.length > limits.maxImages) fail(`一件作品最多 ${limits.maxImages} 張圖。`);

  const images: UploadedImage[] = [];

  for (const [index, item] of (meta as unknown[]).entries()) {
    const { width, height, color } = (item ?? {}) as Record<string, unknown>;
    const full = form.get(`full-${index}`);
    const thumb = form.get(`thumb-${index}`);

    if (!(full instanceof File) || !(thumb instanceof File)) fail("圖片檔案不完整，請重新選擇圖片。");
    const fullFile = full as File;
    const thumbFile = thumb as File;

    if (!isDimension(width, limits.fullMaxWidth) || !isDimension(height, limits.fullMaxHeight) || !isHexColor(color)) {
      fail("圖片資料格式錯誤。");
    }
    if (fullFile.size > limits.fullMaxBytes || thumbFile.size > limits.thumbMaxBytes) fail("圖片檔案太大。");

    const type = await sniffImageType(fullFile);
    if (!type || (await sniffImageType(thumbFile)) !== type) fail("只接受 WebP、JPEG、PNG 圖片。");

    images.push({ full: fullFile, thumb: thumbFile, type: type as SubmissionImageType, width: width as number, height: height as number, color: color as string });
  }

  // 影片可以不附圖，其他情況（只有推特、雲端等連結）一定要有圖，畫廊才有東西可以顯示
  if (!images.length && !youtubeId) fail("請至少上傳一張圖片，或貼上 YouTube 影片連結。");

  return {
    title: title || null,
    artistName,
    artistUrl,
    description: description || null,
    youtubeId,
    links,
    images
  };
}

async function deletePrefix(bucket: GalleryR2Bucket, prefix: string) {
  const { objects } = await bucket.list({ prefix });

  if (objects.length) {
    await bucket.delete(objects.map((object) => object.key));
  }
}

export async function createSubmission(userId: string, form: FormData): Promise<{ id: string }> {
  const input = await parseSubmission(form);
  const pool = getPool();

  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM "GallerySubmission" WHERE "userId" = $1 AND "createdAt" > now() - interval '24 hours'`,
    [userId]
  );
  if (Number(rows[0].count) >= SUBMISSION_LIMITS.perDay) {
    throw new SubmissionError(`每人 24 小時內最多投稿 ${SUBMISSION_LIMITS.perDay} 件，請晚點再試。`, 429);
  }

  const id = randomUUID();
  const prefix = `${PUBLIC_PREFIX}${id}/`;
  const stored: StoredImage[] = [];
  const bucket = input.images.length ? await getGalleryBucket() : null;

  if (input.images.length && !bucket) {
    throw new SubmissionError("尚未設定圖片儲存空間（GALLERY_BUCKET），請聯絡管理員。", 500);
  }

  try {
    for (const [index, image] of input.images.entries()) {
      const ext = SUBMISSION_IMAGE_TYPES[image.type];
      const file = `${index + 1}.${ext}`;
      const thumb = `${index + 1}-thumb.${ext}`;
      const httpMetadata = { contentType: image.type };

      await bucket!.put(prefix + file, await image.full.arrayBuffer(), { httpMetadata });
      await bucket!.put(prefix + thumb, await image.thumb.arrayBuffer(), { httpMetadata });
      stored.push({ file, thumb, width: image.width, height: image.height, color: image.color });
    }

    await pool.query(
      `INSERT INTO "GallerySubmission"
         (id, "userId", title, "artistName", "artistUrl", description, "youtubeId", links, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        userId,
        input.title,
        input.artistName,
        input.artistUrl,
        input.description,
        input.youtubeId,
        JSON.stringify(input.links),
        JSON.stringify(stored)
      ]
    );
  } catch (error) {
    // 寫到一半失敗就把已經傳上去的圖清掉，不留孤兒檔案
    if (bucket) {
      await deletePrefix(bucket, prefix).catch((cleanupError: unknown) => {
        console.error("清除失敗投稿的圖檔時出錯", cleanupError);
      });
    }
    throw error;
  }

  return { id };
}

// ---- 下架／恢復 ----------------------------------------------------------------

export async function setSubmissionStatus(id: string, status: SubmissionStatus, adminId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ status: SubmissionStatus; imageCount: number }>(
    `SELECT status, jsonb_array_length(images) AS "imageCount" FROM "GallerySubmission" WHERE id = $1`,
    [id]
  );
  const current = rows[0];

  if (!current) {
    throw new SubmissionError("找不到這件投稿。", 404);
  }

  if (current.status === status) {
    return;
  }

  const bucket = current.imageCount ? await getGalleryBucket() : null;

  if (current.imageCount && !bucket) {
    throw new SubmissionError("尚未設定圖片儲存空間（GALLERY_BUCKET）。", 500);
  }

  const updateStatus = () =>
    pool.query(
      `UPDATE "GallerySubmission" SET status = $2, "statusChangedBy" = $3, "statusChangedAt" = now() WHERE id = $1`,
      [id, status, adminId]
    );

  if (status === "removed") {
    // 先從畫廊拿掉，再把圖檔搬走
    await updateStatus();
    if (bucket) await moveR2Prefix(bucket, `${PUBLIC_PREFIX}${id}/`, `${REMOVED_PREFIX}${id}/`);
  } else {
    // 先把圖檔搬回來，再放回畫廊，避免畫廊出現破圖
    if (bucket) await moveR2Prefix(bucket, `${REMOVED_PREFIX}${id}/`, `${PUBLIC_PREFIX}${id}/`);
    await updateStatus();
  }
}

/** /uploads 路由用：只提供公開中的圖檔（下架的已經搬到 removed/，這裡讀不到）。 */
export async function getPublicUpload(id: string, file: string) {
  if (!isSubmissionId(id) || !/^\d{1,2}(-thumb)?\.(webp|jpg|png)$/.test(file)) {
    return null;
  }

  const bucket = await getGalleryBucket();
  return bucket ? bucket.get(`${PUBLIC_PREFIX}${id}/${file}`) : null;
}
