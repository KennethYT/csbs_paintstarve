import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 畫廊投稿圖檔用的 R2 bucket（wrangler.jsonc 的 GALLERY_BUCKET）。
 *
 * 專案沒有裝 @cloudflare/workers-types，這裡只宣告用得到的幾個方法，
 * 形狀照 Cloudflare 官方的 R2Bucket。
 */
export type GalleryR2Object = {
  key: string;
  size: number;
  httpEtag: string;
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

export interface GalleryR2Bucket {
  get(key: string): Promise<GalleryR2Object | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
}

declare global {
  interface CloudflareEnv {
    GALLERY_BUCKET?: GalleryR2Bucket;
  }
}

/**
 * 取得 bucket。一律用 async 模式：部署後由 Worker 提供；`next dev` / `next start`
 * 在 Node 上跑時，OpenNext 會改用 wrangler 在本機模擬（存在 .wrangler/state）。
 */
export async function getGalleryBucket(): Promise<GalleryR2Bucket | null> {
  const { env } = await getCloudflareContext({ async: true });
  return env.GALLERY_BUCKET ?? null;
}

/** 把 fromPrefix 底下的所有檔案搬到 toPrefix（R2 沒有 rename，只能讀出來重寫再刪掉）。 */
export async function moveR2Prefix(bucket: GalleryR2Bucket, fromPrefix: string, toPrefix: string) {
  let cursor: string | undefined;

  do {
    const page = await bucket.list({ prefix: fromPrefix, cursor });

    for (const { key } of page.objects) {
      const object = await bucket.get(key);

      if (!object) {
        continue;
      }

      await bucket.put(toPrefix + key.slice(fromPrefix.length), await object.arrayBuffer(), {
        httpMetadata: { contentType: object.httpMetadata?.contentType }
      });
      await bucket.delete(key);
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
