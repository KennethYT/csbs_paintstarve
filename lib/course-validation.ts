import { GLOBAL_CAPACITY, GLOBAL_OPEN_AT, dayLabels, isCourseCategory, periods } from "@/lib/course-constants";
import type { CourseScheduleSlot, CreateCoursePayload } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type CoursePayloadError = { error: string };

function isPayloadError(value: CreateCoursePayload | CoursePayloadError): value is CoursePayloadError {
  return "error" in value;
}

function parseSchedule(value: unknown): CourseScheduleSlot[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const slots: CourseScheduleSlot[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }

    const record = item as Record<string, unknown>;
    const day = Number(record.day);

    if (!Number.isInteger(day) || day < 1 || day > dayLabels.length) {
      return null;
    }

    // 選預設節次：periodIndex 有值，startTime/endTime 不能有值
    if (record.periodIndex !== null && record.periodIndex !== undefined) {
      const periodIndex = Number(record.periodIndex);

      if (!Number.isInteger(periodIndex) || periodIndex < 0 || periodIndex >= periods.length) {
        return null;
      }

      slots.push({ day, periodIndex, startTime: null, endTime: null });
      continue;
    }

    // 選自訂時段：periodIndex 是 null，改用 startTime/endTime
    const { startTime, endTime } = record;

    if (typeof startTime !== "string" || typeof endTime !== "string") {
      return null;
    }

    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || startTime >= endTime) {
      return null;
    }

    slots.push({ day, periodIndex: null, startTime, endTime });
  }

  return slots;
}

function parseCourseDates(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const dates: string[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !DATE_RE.test(item)) {
      return null;
    }

    dates.push(item);
  }

  return dates;
}

/** 建立與編輯課程共用的欄位驗證，回傳整理好的 payload 或錯誤訊息。 */
export function parseCoursePayload(body: Partial<CreateCoursePayload> | null): CreateCoursePayload | CoursePayloadError {
  if (!body) {
    return { error: "請求格式錯誤。" };
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return { error: "請輸入課程名稱。" };
  }

  if (!isCourseCategory(body.category)) {
    return { error: "課程分類不正確。" };
  }

  const schedule = parseSchedule(body.schedule);

  if (!schedule) {
    return { error: "上課星期／節次不正確，至少要選一組。" };
  }

  const courseDates = parseCourseDates(body.courseDates);

  if (!courseDates) {
    return { error: "上課日期不正確，至少要選一個日期。" };
  }

  const groupCount = Number(body.groupCount);

  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 100) {
    return { error: "組數必須介於 1 到 100 之間。" };
  }

  const syllabus = Array.isArray(body.syllabus)
    ? body.syllabus.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    : [];

  return {
    title,
    category: body.category,
    schedule,
    // 全站課程統一限額，不接受個別設定，見 GLOBAL_CAPACITY。
    capacity: GLOBAL_CAPACITY,
    // 全站課程只在同一個固定時間開放報名，不接受個別設定，見 GLOBAL_OPEN_AT。
    openAt: GLOBAL_OPEN_AT,
    courseDates,
    groupCount,
    location: typeof body.location === "string" && body.location.trim() ? body.location.trim() : "教室未定",
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : "課程簡介尚未提供。",
    syllabus: syllabus.map((line) => line.trim())
  };
}

export { isPayloadError };
