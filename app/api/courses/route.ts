import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { createCourse, getCoursesSnapshot } from "@/lib/course-service";
import { dayLabels, isCourseCategory, periods } from "@/lib/course-constants";
import type { CreateCoursePayload } from "@/lib/types";

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

  const day = Number(body.day);

  if (!Number.isInteger(day) || day < 1 || day > dayLabels.length) {
    return jsonError("上課星期必須是週一到週日。", 400);
  }

  const periodIndex = Number(body.periodIndex);

  if (!Number.isInteger(periodIndex) || periodIndex < 0 || periodIndex >= periods.length) {
    return jsonError("上課節次不正確。", 400);
  }

  const capacity = Number(body.capacity);

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return jsonError("名額必須介於 1 到 500 之間。", 400);
  }

  const openAt = Number(body.openAt);

  if (!Number.isFinite(openAt)) {
    return jsonError("開放時間不正確。", 400);
  }

  const syllabus = Array.isArray(body.syllabus)
    ? body.syllabus.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    : [];

  const course = await createCourse(user.id, {
    title,
    category: body.category,
    day,
    periodIndex,
    capacity,
    openAt,
    location: typeof body.location === "string" && body.location.trim() ? body.location.trim() : "教室未定",
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : "課程簡介尚未提供。",
    syllabus: syllabus.map((line) => line.trim())
  });

  return jsonOk({ courseId: course.id }, 201);
}
