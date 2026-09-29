import { courseSystemClosed, jsonError, jsonOk, readJson } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { CourseError, deleteCourse, getCourse, updateCourse } from "@/lib/course-service";
import { isPayloadError, parseCoursePayload } from "@/lib/course-validation";
import type { CreateCoursePayload } from "@/lib/types";

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const closed = courseSystemClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  const { courseId } = await context.params;

  try {
    const result = await getCourse(courseId, user.id);
    return jsonOk({ ...result });
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("get course failed", error);
    return jsonError("讀取課程失敗。", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const closed = courseSystemClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "teacher") {
    return jsonError("只有教師可以修改課程。", 403);
  }

  const { courseId } = await context.params;
  const body = await readJson<Partial<CreateCoursePayload>>(request);
  const payload = parseCoursePayload(body);

  if (isPayloadError(payload)) {
    return jsonError(payload.error, 400);
  }

  try {
    await updateCourse(courseId, user.id, payload);
    return jsonOk({});
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("update course failed", error);
    return jsonError("更新課程失敗。", 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const closed = courseSystemClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "teacher") {
    return jsonError("只有教師可以刪除課程。", 403);
  }

  const { courseId } = await context.params;

  try {
    await deleteCourse(courseId, user.id);
    return jsonOk({});
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("delete course failed", error);
    return jsonError("刪除課程失敗。", 500);
  }
}
