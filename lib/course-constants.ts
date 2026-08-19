import type { CourseCategory, Period } from "@/lib/types";

export const categories: CourseCategory[] = [
  "資訊",
  "人文藝術",
  "商管",
  "自然科學",
  "語言",
  "社會科學",
  "其他"
];

export const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

/** 00:00 到隔日 00:00，切成 24 個整點時段，涵蓋全天、含週末。 */
export const periods: Period[] = Array.from({ length: 24 }, (_, hour) => {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(hour + 1).padStart(2, "0")}:00`;
  return { label: start, time: `${start}-${end}` };
});

export function isCourseCategory(value: unknown): value is CourseCategory {
  return typeof value === "string" && categories.includes(value as CourseCategory);
}

/**
 * 全站統一開搶時間：不論新舊課程，一律只在這個時間點開放報名，
 * 教師端無法個別設定。以固定字串組出時間，避免 Date 依伺服器／瀏覽器
 * 時區換算 getHours() 等造成 SSR 與 CSR 顯示不一致。
 */
export const GLOBAL_OPEN_AT = new Date("2026-08-21T20:00:00+08:00").getTime();
export const GLOBAL_OPEN_AT_LABEL = "2026/08/21 20:00";

/** 全站課程統一限額 20 人，不論新舊課程，教師端無法個別設定。 */
export const GLOBAL_CAPACITY = 20;
