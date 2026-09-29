import { getPublicUpload } from "@/lib/gallery-submissions";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png"
};

/**
 * 投稿圖檔（R2 的 submissions/<id>/<file>）。
 * 圖在上傳前已經壓好水印；這裡跟 public/_headers 對 /gallery/* 一樣附上拒絕 AI 收集的標頭。
 * 下架的投稿圖檔已經搬到 removed/，這裡一律 404。
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await context.params;
  const object = await getPublicUpload(id, file);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": CONTENT_TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Content-Length": String(object.size),
      ETag: object.httpEtag,
      // 下架後瀏覽器端的快取最多留一小時
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noai, noimageai",
      "tdm-reservation": "1"
    }
  });
}
