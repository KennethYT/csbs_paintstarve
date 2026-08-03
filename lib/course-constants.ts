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
