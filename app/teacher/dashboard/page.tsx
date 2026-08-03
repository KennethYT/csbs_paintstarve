"use client";

import { useMemo } from "react";
import { useClassroom } from "@/components/classroom-store";
import { getFillPct } from "@/lib/course-utils";
import { CourseDataBoundary } from "@/components/course-states";

export default function TeacherDashboardPage() {
  const classroom = useClassroom();

  const dashboard = useMemo(() => {
    const teacherCourses = classroom.courses.filter((course) => course.teacherId === classroom.user.id);
    const totalCourses = teacherCourses.length;
    const totalEnrollments = teacherCourses.reduce((sum, course) => sum + course.enrolled, 0);
    const totalWaitlist = teacherCourses.reduce((sum, course) => sum + course.waitlistCount, 0);
    const totalCapacity = teacherCourses.reduce((sum, course) => sum + course.capacity, 0);
    const avgFillRate = totalCapacity === 0 ? 0 : Math.round((totalEnrollments / totalCapacity) * 100);
    const topCourses = [...teacherCourses]
      .sort((left, right) => right.enrolled / right.capacity - left.enrolled / left.capacity)
      .slice(0, 3)
      .map((course, index) => ({
        rank: index + 1,
        id: course.id,
        title: course.title,
        enrolled: course.enrolled,
        capacity: course.capacity,
        fillPct: getFillPct(course.enrolled, course.capacity)
      }));

    return { totalCourses, totalEnrollments, totalWaitlist, avgFillRate, topCourses };
  }, [classroom.courses, classroom.user.id]);

  return (
    <section>
      <h1 className="section-title" style={{ marginBottom: 20 }}>
        課程總覽儀表板
      </h1>

      <CourseDataBoundary
        skeleton={
          <div className="stat-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="card stat-card">
                <div className="skeleton" style={{ height: 13, width: "50%" }} />
                <div className="skeleton" style={{ height: 30, width: "35%", marginTop: 10 }} />
              </div>
            ))}
          </div>
        }
      >
        <div className="stat-grid">
          <StatCard label="總課程數" value={dashboard.totalCourses} />
          <StatCard label="總選課人次" value={dashboard.totalEnrollments} />
          <StatCard label="總候補人數" value={dashboard.totalWaitlist} />
          <StatCard label="平均額滿率" value={`${dashboard.avgFillRate}%`} />
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontWeight: 900, fontSize: 15, marginBottom: 14, marginTop: 0 }}>熱門課程排行</h2>

          {dashboard.topCourses.length === 0 ? (
            <div className="muted" style={{ fontSize: 14 }}>
              還沒有課程資料，建立課程後就會出現排行。
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dashboard.topCourses.map((course) => (
                <div key={course.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5, gap: 10 }}>
                    <span style={{ fontWeight: 800 }}>
                      #{course.rank} {course.title}
                    </span>
                    <span className="muted" style={{ whiteSpace: "nowrap" }}>
                      {course.enrolled}/{course.capacity}（{course.fillPct}%）
                    </span>
                  </div>
                  <div className="meter" style={{ height: 7 }}>
                    <div
                      className="meter__fill"
                      data-full={course.enrolled >= course.capacity}
                      style={{ width: `${course.fillPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CourseDataBoundary>
    </section>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="card stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}
