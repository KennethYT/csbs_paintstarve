import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { CourseError, getCourse } from "@/lib/course-service";

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
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
