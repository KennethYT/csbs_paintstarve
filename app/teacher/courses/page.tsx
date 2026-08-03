"use client";

import Link from "next/link";
import { buildPeriodLabel, dayLabel, getFillPct, getStatus } from "@/lib/course-utils";
import { useClassroom } from "@/components/classroom-store";
import { CourseDataBoundary } from "@/components/course-states";
import { LocationIcon } from "@/components/icons";

export default function TeacherCoursesPage() {
  const classroom = useClassroom();
  // 以 teacherId 比對，而非姓名 —— 同名老師不會互相看到對方的課
  const teacherCourses = classroom.courses.filter((course) => course.teacherId === classroom.user.id);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="section-title">我的課程</h1>
          <div className="page-head__subtitle">管理你開設的課程與搶課狀態</div>
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
                        {dayLabel(course.day)} {buildPeriodLabel(course.periodIndex)} ·
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

                  <Link className="btn btn-ghost" href={`/teacher/courses/${course.id}/roster`}>
                    查看名單
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CourseDataBoundary>
    </section>
  );
}
