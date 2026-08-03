"use client";

import Link from "next/link";
import { dayLabels } from "@/lib/course-constants";
import { buildPeriodLabel, dayLabel, getDayCells } from "@/lib/course-utils";
import { useClassroom } from "@/components/classroom-store";
import { CourseDataBoundary } from "@/components/course-states";
import { AlertIcon } from "@/components/icons";

export default function StudentSchedulePage() {
  const classroom = useClassroom();

  const enrollments = Object.entries(classroom.studentEnrollments)
    .map(([courseId, enrollment]) => {
      const course = classroom.courses.find((item) => item.id === courseId);

      if (!course) {
        return null;
      }

      return {
        courseId,
        title: course.title,
        teacher: course.teacher,
        day: course.day,
        periodTime: buildPeriodLabel(course.periodIndex),
        status: enrollment.status,
        statusLabel:
          enrollment.status === "enrolled" ? "已確認" : `候補第 ${enrollment.position} 位`
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.day - b.day || a.periodTime.localeCompare(b.periodTime));

  const rows = getDayCells(classroom.courses, classroom.studentEnrollments);

  return (
    <section>
      <h1 className="section-title">我的課表</h1>
      <div className="page-head__subtitle" style={{ marginBottom: 22 }}>
        已搶到與候補中的課程一覽
      </div>

      <CourseDataBoundary
        skeleton={
          <div className="card skeleton-card" aria-hidden="true">
            <div className="skeleton" style={{ height: 220, width: "100%" }} />
          </div>
        }
      >
        {enrollments.length === 0 ? (
          <div className="card empty-state">
            尚未搶到任何課程。
            <br />
            前往{" "}
            <Link href="/student/browse" style={{ color: "var(--subtitle)", fontWeight: 900 }}>
              課程列表
            </Link>{" "}
            開始搶課吧！
          </div>
        ) : (
          <>
            <div className="card timetable-scroll">
              <div className="timetable">
                <div className="timetable__head timetable__head--period">節次</div>
                {dayLabels.map((day) => (
                  <div key={day} className="timetable__head">
                    週{day}
                  </div>
                ))}

                {rows.map((row) => (
                  <div key={row.label} style={{ display: "contents" }}>
                    <div className="timetable__period">
                      <div className="timetable__period-label">{row.label}</div>
                      <div>{row.time}</div>
                    </div>
                    {row.cells.map((entries, index) => (
                      <div key={`${row.label}-${index}`} className="timetable__cell">
                        {entries.map((entry) => (
                          <div
                            key={entry.courseId}
                            className="timetable__entry"
                            data-phase={entry.phase}
                          >
                            {entry.title}
                            <div className="timetable__entry-status">{entry.statusLabel}</div>
                          </div>
                        ))}
                        {entries.length > 1 ? (
                          <div className="timetable__conflict">
                            <AlertIcon aria-hidden="true" />
                            此時段撞堂
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enrollments.map((item) => (
                <div key={item.courseId} className="card course-card__footer" style={{ padding: 16 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14.5 }}>{item.title}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {item.teacher} 老師 · {dayLabel(item.day)} {item.periodTime}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge badge-enrollment" data-phase={item.status}>
                      {item.statusLabel}
                    </span>
                    <button
                      className="btn btn-status"
                      data-phase={item.status === "enrolled" ? "my-enrolled" : "my-waitlist"}
                      disabled={classroom.pendingCourseId === item.courseId}
                      onClick={() => void classroom.cancelEnrollment(item.courseId)}
                    >
                      {classroom.pendingCourseId === item.courseId
                        ? "處理中…"
                        : item.status === "enrolled"
                          ? "取消選課"
                          : "取消候補"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CourseDataBoundary>
    </section>
  );
}
