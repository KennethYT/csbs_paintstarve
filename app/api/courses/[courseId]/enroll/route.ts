import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { CourseError, cancelEnrollment, grabCourse } from "@/lib/course-service";

/** 搶課／加入候補 */
export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "student") {
    return jsonError("只有學生可以選課。", 403);
  }

  const { courseId } = await context.params;

  try {
    const result = await grabCourse(courseId, user.id);
    return jsonOk({ result });
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("grab course failed", error);
    return jsonError("搶課失敗，請稍後再試。", 500);
  }
}

/** 退選／取消候補 */
export async function DELETE(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "student") {
    return jsonError("只有學生可以退選。", 403);
  }

  const { courseId } = await context.params;

  try {
    const result = await cancelEnrollment(courseId, user.id);
    return jsonOk({ result });
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("cancel enrollment failed", error);
    return jsonError("取消失敗，請稍後再試。", 500);
  }
}
