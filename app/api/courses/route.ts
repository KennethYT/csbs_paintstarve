import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { createCourse, getCoursesSnapshot } from "@/lib/course-service";
import { dayLabels, isCourseCategory, periods } from "@/lib/course-constants";
import type { CourseScheduleSlot, CreateCoursePayload } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  const snapshot = await getCoursesSnapshot(user.id);
  return jsonOk({ ...snapshot });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "teacher") {
    return jsonError("只有教師可以建立課程。", 403);
  }

  const body = await readJson<Partial<CreateCoursePayload>>(request);

  if (!body) {
    return jsonError("請求格式錯誤。", 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return jsonError("請輸入課程名稱。", 400);
  }

  if (!isCourseCategory(body.category)) {
    return jsonError("課程分類不正確。", 400);
  }

  const schedule = parseSchedule(body.schedule);

  if (!schedule) {
    return jsonError("上課星期／節次不正確，至少要選一組。", 400);
  }

  const capacity = Number(body.capacity);

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return jsonError("名額必須介於 1 到 500 之間。", 400);
  }

  const openAt = Number(body.openAt);

  if (!Number.isFinite(openAt)) {
    return jsonError("開放時間不正確。", 400);
  }

  const courseDates = parseCourseDates(body.courseDates);

  if (!courseDates) {
    return jsonError("上課日期不正確，至少要選一個日期。", 400);
  }

  const groupCount = Number(body.groupCount);

  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 100) {
    return jsonError("組數必須介於 1 到 100 之間。", 400);
  }

  const syllabus = Array.isArray(body.syllabus)
    ? body.syllabus.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    : [];

  const course = await createCourse(user.id, {
    title,
    category: body.category,
    schedule,
    capacity,
    openAt,
    courseDates,
    groupCount,
    location: typeof body.location === "string" && body.location.trim() ? body.location.trim() : "教室未定",
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : "課程簡介尚未提供。",
    syllabus: syllabus.map((line) => line.trim())
  });

  return jsonOk({ courseId: course.id }, 201);
}
