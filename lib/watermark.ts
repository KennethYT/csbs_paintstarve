import { SUBMISSION_LIMITS, type SubmissionImageType } from "@/lib/gallery-constants";

/**
 * 投稿圖片在瀏覽器端的處理（只能在 client 用，依賴 canvas）。
 *
 * 部署在 Cloudflare Workers 上跑不了 sharp，所以縮圖、鋪白底、壓水印都在上傳前做完，
 * 樣式跟 public/gallery 的既有作品一致：滿版淡斜紋「@作者 · NO AI TRAINING · 禁止 AI 學習」
 * + 右下角「© @作者 · 禁止 AI 學習／轉載」。動圖只會取第一格。
 */

export type ProcessedImage = {
  full: Blob;
  thumb: Blob;
  type: SubmissionImageType;
  width: number;
  height: number;
  color: string;
};

const FONT_FAMILY = `"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", sans-serif`;
const font = (size: number) => `700 ${size}px ${FONT_FAMILY}`;

function fitInside(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, artist: string) {
  const short = Math.min(width, height);

  // 滿版淡斜紋：旋轉 -30 度後交錯排列，灰字加一點白邊，淺色與深色的圖上都看得到
  const tileText = `${artist} · NO AI TRAINING · 禁止 AI 學習`;
  const tileSize = Math.max(9, Math.round(short / 30));
  ctx.save();
  ctx.font = font(tileSize);
  const tileWidth = ctx.measureText(tileText).width + tileSize * 3;
  const tileHeight = tileSize * 4.5;
  const diagonal = Math.hypot(width, height);
  ctx.fillStyle = "rgba(128, 128, 128, 0.2)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = Math.max(1, tileSize / 14);
  ctx.rotate(-Math.PI / 6);

  for (let row = 0, y = -diagonal; y < diagonal * 1.2; row++, y += tileHeight) {
    for (let x = -diagonal - (row % 2 ? tileWidth / 2 : 0); x < diagonal * 1.2; x += tileWidth) {
      ctx.strokeText(tileText, x, y);
      ctx.fillText(tileText, x, y);
    }
  }
  ctx.restore();

  // 右下角署名：半透明黑底膠囊 + 白字，太長就縮字級
  const label = `© ${artist} · 禁止 AI 學習／轉載`;
  let size = Math.max(8, Math.round(short / 34));
  ctx.font = font(size);
  while (size > 6 && ctx.measureText(label).width + size * 1.6 > width * 0.92) {
    size -= 1;
    ctx.font = font(size);
  }

  const labelWidth = ctx.measureText(label).width + size * 1.6;
  const labelHeight = size * 1.9;
  const margin = Math.max(4, Math.round(size * 0.8));
  const x = width - labelWidth - margin;
  const y = height - labelHeight - margin;

  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.beginPath();
  ctx.roundRect(x, y, labelWidth, labelHeight, labelHeight / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + labelWidth / 2, y + labelHeight / 2);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("圖片轉檔失敗。"))), type, quality);
  });
}

/** 優先輸出 WebP；瀏覽器不支援（舊版 Safari 會悄悄改給 PNG）就改用 JPEG。 */
async function encode(canvas: HTMLCanvasElement, quality: number, preferred?: SubmissionImageType) {
  if (preferred !== "image/jpeg") {
    const webp = await toBlob(canvas, "image/webp", quality);

    if (webp.type === "image/webp") {
      return { blob: webp, type: "image/webp" as const };
    }
  }

  return { blob: await toBlob(canvas, "image/jpeg", quality + 0.03), type: "image/jpeg" as const };
}

function render(bitmap: ImageBitmap, width: number, height: number, artist: string) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("瀏覽器不支援圖片處理。");
  }

  // 透明背景的線稿放在深色頁面上會看不見，一律鋪白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  drawWatermark(ctx, width, height, artist);
  return canvas;
}

/** 圖片主色（縮成 1×1 取平均），載入前當底色用。 */
function averageColor(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return "#f8f8f8";
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1, 1);
  ctx.drawImage(bitmap, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export async function processImage(file: File, artist: string): Promise<ProcessedImage> {
  const limits = SUBMISSION_LIMITS;

  if (file.size > limits.inputFileMaxBytes) {
    throw new Error(`「${file.name}」超過 ${limits.inputFileMaxBytes / 1024 / 1024}MB。`);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`「${file.name}」不是可以讀取的圖片。`);
  }

  try {
    const fullSize = fitInside(bitmap.width, bitmap.height, limits.fullMaxWidth, limits.fullMaxHeight);
    // 格線最多只露出 560px 高，超長的圖縮圖也不用太長
    const thumbSize = fitInside(bitmap.width, bitmap.height, limits.thumbWidth, limits.thumbWidth * 2.5);
    const full = await encode(render(bitmap, fullSize.width, fullSize.height, artist), 0.82);
    // 縮圖跟大圖用同一種格式
    const thumb = await encode(render(bitmap, thumbSize.width, thumbSize.height, artist), 0.72, full.type);

    return {
      full: full.blob,
      thumb: thumb.blob,
      type: full.type,
      width: fullSize.width,
      height: fullSize.height,
      color: averageColor(bitmap)
    };
  } finally {
    bitmap.close();
  }
}
