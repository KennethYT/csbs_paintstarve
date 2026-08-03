import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserFromRequest } from "@/lib/session";
import { CourseError, getRoster } from "@/lib/course-service";

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (user.role !== "teacher") {
    return jsonError("只有教師可以查看選課名單。", 403);
  }

  const { courseId } = await context.params;

  try {
    const roster = await getRoster(courseId, user.id);
    return jsonOk({ roster });
  } catch (error) {
    if (error instanceof CourseError) {
      return jsonError(error.message, error.status);
    }

    console.error("get roster failed", error);
    return jsonError("讀取選課名單失敗。", 500);
  }
}
