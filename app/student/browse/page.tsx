"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories } from "@/lib/course-constants";
import {
  buildPeriodLabel,
  dayLabel,
  getButtonLabel,
  getFillPct,
  getStatus,
  isActionable,
  isCancelAction
} from "@/lib/course-utils";
import { useClassroom } from "@/components/classroom-store";
import { CourseDataBoundary } from "@/components/course-states";
import { CheckIcon, LocationIcon } from "@/components/icons";

export default function StudentBrowsePage() {
  const classroom = useClassroom();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");

  const courses = useMemo(() => {
    const keyword = search.trim();

    return classroom.courses.filter((course) => {
      const matchCategory = categoryFilter === "全部" || course.category === categoryFilter;
      const matchSearch =
        !keyword || course.title.includes(keyword) || course.teacher.includes(keyword);
      return matchCategory && matchSearch;
    });
  }, [categoryFilter, classroom.courses, search]);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="section-title">課程列表</h1>
          <div className="page-head__subtitle">開搶瞬間名額即時變動，把握時機搶課</div>
        </div>
        <input
          className="input search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋課程名稱或教師…"
          aria-label="搜尋課程"
        />
      </div>

      <div className="chip-row" role="group" aria-label="課程分類">
        {["全部", ...categories].map((category) => (
          <button
            key={category}
            className="btn chip"
            data-active={categoryFilter === category}
            aria-pressed={categoryFilter === category}
            onClick={() => setCategoryFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <CourseDataBoundary>
        {courses.length === 0 ? (
          <div className="card empty-state">
            找不到符合條件的課程。
            <br />
            換個關鍵字或分類再試試看。
          </div>
        ) : (
          <div className="grid-auto">
            {courses.map((course) => {
              const status = getStatus(course, classroom.now, classroom.studentEnrollments[course.id]);
              const actionable = isActionable(status.phase);
              const cancels = isCancelAction(status.phase);
              const isPending = classroom.pendingCourseId === course.id;

              return (
                <article key={course.id} className="card course-card">
                  <Link href={`/student/browse/${course.id}`} className="course-card__link">
                    <div className="course-card__head">
                      <div className="course-card__title">{course.title}</div>
                      <span className="badge badge-category">{course.category}</span>
                    </div>
                    <div className="course-card__meta">
                      {course.teacher} 老師 · {dayLabel(course.day)} {buildPeriodLabel(course.periodIndex)}
                    </div>
                    <div className="course-card__meta course-card__meta--icon" style={{ marginTop: 2 }}>
                      <LocationIcon aria-hidden="true" />
                      {course.location}
                    </div>
                  </Link>

                  <div>
                    <div className="meter__label">
                      <span>名額</span>
                      <span>
                        已選 <b style={{ color: "var(--text)" }}>{course.enrolled}</b> / {course.capacity}
                        {course.waitlistCount > 0 ? `（候補 ${course.waitlistCount}）` : ""}
                      </span>
                    </div>
                    <div
                      className="meter"
                      role="progressbar"
                      aria-valuenow={course.enrolled}
                      aria-valuemin={0}
                      aria-valuemax={course.capacity}
                      aria-label={`${course.title} 名額`}
                    >
                      <div
                        className="meter__fill"
                        data-full={course.enrolled >= course.capacity}
                        style={{ width: `${getFillPct(course.enrolled, course.capacity)}%` }}
                      />
                    </div>
                  </div>

                  <div className="course-card__footer">
                    <span className="status-text" data-phase={status.phase}>
                      {status.phase === "my-enrolled" ? <CheckIcon aria-hidden="true" /> : null}
                      {status.label}
                    </span>
                    <button
                      className="btn btn-status"
                      data-phase={status.phase}
                      disabled={!actionable || isPending}
                      onClick={() => {
                        if (cancels) {
                          void classroom.cancelEnrollment(course.id);
                          return;
                        }

                        void classroom.grabCourse(course.id);
                      }}
                    >
                      {isPending ? "處理中…" : getButtonLabel(status.phase)}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CourseDataBoundary>
    </section>
  );
}
