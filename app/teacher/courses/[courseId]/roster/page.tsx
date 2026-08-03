import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { CourseError, getCourse, getRoster } from "@/lib/course-service";
import { BackIcon } from "@/components/icons";

/**
 * Server component：名單直接在伺服器端取，不經過瀏覽器 API 呼叫。
 * getRoster 會驗證這門課確實屬於這位教師。
 */
export default async function TeacherRosterPage({
  params
}: Readonly<{ params: Promise<{ courseId: string }> }>) {
  const { courseId } = await params;
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  let content: { title: string; enrolled: number; capacity: number; waitlistCount: number } | null = null;
  let roster: Awaited<ReturnType<typeof getRoster>> | null = null;
  let error = "";

  try {
    const [detail, rosterResult] = await Promise.all([
      getCourse(courseId, user.id),
      getRoster(courseId, user.id)
    ]);

    content = {
      title: detail.course.title,
      enrolled: detail.course.enrolled,
      capacity: detail.course.capacity,
      waitlistCount: detail.course.waitlistCount
    };
    roster = rosterResult;
  } catch (caught) {
    error = caught instanceof CourseError ? caught.message : "讀取選課名單失敗。";
  }

  return (
    <section>
      <Link href="/teacher/courses" className="btn btn-link" style={{ marginBottom: 16 }}>
        <BackIcon aria-hidden="true" />
        回到我的課程
      </Link>

      {error || !content || !roster ? (
        <div className="error-state" role="alert">
          <span>{error || "讀取選課名單失敗。"}</span>
          <Link className="btn btn-brand" href="/teacher/courses" style={{ padding: "10px 20px", fontWeight: 900 }}>
            回到我的課程
          </Link>
        </div>
      ) : (
        <>
          <h1 className="section-title">{content.title}</h1>
          <div className="page-head__subtitle" style={{ marginBottom: 20 }}>
            已選 {content.enrolled} / {content.capacity} · 候補 {content.waitlistCount} 人
          </div>

          <h2 style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
            已確認學生（{roster.enrolledStudents.length}）
          </h2>
          <div className="card" style={{ overflow: "hidden", marginBottom: 22 }}>
            {roster.enrolledStudents.length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                目前還沒有學生選這門課。
              </div>
            ) : (
              roster.enrolledStudents.map((student) => (
                <div key={student.id} className="list-row">
                  <span style={{ fontWeight: 700 }}>{student.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {student.id.slice(0, 8)}
                  </span>
                </div>
              ))
            )}
          </div>

          {roster.waitlist.length > 0 ? (
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
                候補名單（{roster.waitlist.length}）
              </h2>
              <div className="card" style={{ overflow: "hidden" }}>
                {roster.waitlist.map((student) => (
                  <div key={student.id} className="list-row">
                    <span style={{ fontWeight: 700 }}>{student.name}</span>
                    <span style={{ color: "var(--status-waitlist)", fontWeight: 900, fontSize: 13 }}>
                      候補第 {student.position} 位
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
