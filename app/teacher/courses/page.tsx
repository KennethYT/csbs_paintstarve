"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCourseDates, formatSchedule, getFillPct, getStatus } from "@/lib/course-utils";
import { useClassroom } from "@/components/classroom-store";
import { CourseDataBoundary } from "@/components/course-states";
import { DeleteIcon, LocationIcon } from "@/components/icons";

export default function TeacherCoursesPage() {
  const classroom = useClassroom();
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  // 以 teacherId 比對，而非姓名 —— 同名老師不會互相看到對方的課
  const teacherCourses = classroom.courses.filter((course) => course.teacherId === classroom.user.id);

  const handleDelete = async (courseId: string, title: string) => {
    const confirmed = window.confirm(`確定要刪除課程「${title}」嗎？此操作無法復原，已選課與候補的學生也會一併移除。`);

    if (!confirmed) {
      return;
    }

    setDeletingCourseId(courseId);
    await classroom.deleteTeacherCourse(courseId);
    setDeletingCourseId(null);
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="section-title">我的課程</h1>
          <div className="page-head__subtitle">管理你開設的課程與報名狀態</div>
        </div>
        <Link className="btn btn-brand" href="/teacher/courses/new" style={{ padding: "11px 18px", fontWeight: 900 }}>
          + 建立新課程
        </Link>
      </div>

      <CourseDataBoundary>
        {teacherCourses.length === 0 ? (
          <div className="card empty-state">
            你還沒有開設任何課程。
            <br />
            <Link href="/teacher/courses/new" style={{ color: "var(--subtitle)", fontWeight: 900 }}>
              建立第一門課程
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {teacherCourses.map((course) => {
              const status = getStatus(course, classroom.now);

              return (
                <div key={course.id} className="card course-card__footer" style={{ padding: 18 }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 15.5 }}>{course.title}</div>
                    <div className="muted course-card__meta--icon" style={{ fontSize: 13, marginTop: 4 }}>
                      <span>
                        {formatSchedule(course.schedule)} · 上課日期 {formatCourseDates(course.courseDates)} · 共{" "}
                        {course.groupCount} 組 ·
                      </span>
                      <LocationIcon aria-hidden="true" />
                      {course.location}
                    </div>
                  </div>

                  <div style={{ minWidth: 160 }}>
                    <div className="meter__label">
                      <span>
                        已選 {course.enrolled} / {course.capacity}
                      </span>
                      <span>候補 {course.waitlistCount}</span>
                    </div>
                    <div className="meter">
                      <div
                        className="meter__fill"
                        data-full={course.enrolled >= course.capacity}
                        style={{ width: `${getFillPct(course.enrolled, course.capacity)}%` }}
                      />
                    </div>
                  </div>

                  <span className="status-text" data-phase={status.phase}>
                    {status.label}
                  </span>

                  <Link className="btn btn-ghost" href={`/teacher/courses/${course.id}/edit`}>
                    編輯課程
                  </Link>

                  <Link className="btn btn-ghost" href={`/teacher/courses/${course.id}/roster`}>
                    查看名單
                  </Link>

                  <button
                    type="button"
                    className="btn btn-icon-danger"
                    aria-label={`刪除課程「${course.title}」`}
                    disabled={deletingCourseId === course.id}
                    onClick={() => void handleDelete(course.id, course.title)}
                  >
                    <DeleteIcon aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CourseDataBoundary>
    </section>
  );
}
