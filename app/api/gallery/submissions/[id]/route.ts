import { gallerySubmissionClosed, jsonError, jsonOk, readJson } from "@/lib/api";
import { isSubmissionId, setSubmissionStatus, SubmissionError } from "@/lib/gallery-submissions";
import { isGalleryAdmin } from "@/lib/gallery-admins";
import { getSessionUserFromRequest } from "@/lib/session";

/** 管理員下架／恢復投稿：body 為 { status: "removed" | "published" }。 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const closed = gallerySubmissionClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  if (!(await isGalleryAdmin(user.id))) {
    return jsonError("只有管理員可以下架投稿。", 403);
  }

  const { id } = await context.params;
  const body = await readJson<{ status?: unknown }>(request);
  const status = body?.status;

  if (!isSubmissionId(id)) {
    return jsonError("找不到這件投稿。", 404);
  }

  if (status !== "removed" && status !== "published") {
    return jsonError("status 只能是 removed 或 published。", 400);
  }

  try {
    await setSubmissionStatus(id, status, user.id);
    return jsonOk({});
  } catch (error) {
    if (error instanceof SubmissionError) {
      return jsonError(error.message, error.status);
    }

    console.error("update gallery submission failed", error);
    return jsonError("更新失敗，請稍後再試。", 500);
  }
}
