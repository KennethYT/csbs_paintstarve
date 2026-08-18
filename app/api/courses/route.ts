import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { createCourse, getCoursesSnapshot } from "@/lib/course-service";
import { isPayloadError, parseCoursePayload } from "@/lib/course-validation";
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
  const payload = parseCoursePayload(body);

  if (isPayloadError(payload)) {
    return jsonError(payload.error, 400);
  }

  const course = await createCourse(user.id, payload);

  return jsonOk({ courseId: course.id }, 201);
}
