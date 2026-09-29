import { gallerySubmissionClosed, jsonError, jsonOk } from "@/lib/api";
import { createSubmission, SubmissionError } from "@/lib/gallery-submissions";
import { getSessionUserFromRequest } from "@/lib/session";

/** 投稿到畫廊（multipart 表單，格式見 lib/gallery-submissions.ts 的 parseSubmission）。 */
export async function POST(request: Request) {
  const closed = gallerySubmissionClosed();

  if (closed) {
    return closed;
  }

  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return jsonError("尚未登入。", 401);
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return jsonError("表單格式錯誤。", 400);
  }

  try {
    const { id } = await createSubmission(user.id, form);
    return jsonOk({ id }, 201);
  } catch (error) {
    if (error instanceof SubmissionError) {
      return jsonError(error.message, error.status);
    }

    console.error("create gallery submission failed", error);
    return jsonError("投稿失敗，請稍後再試。", 500);
  }
}
