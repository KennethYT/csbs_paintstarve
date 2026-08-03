"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { BackIcon, BulletIcon, CheckIcon, LocationIcon } from "@/components/icons";

export default function StudentCourseDetailPage() {
  const classroom = useClassroom();
  const params = useParams<{ courseId: string }>();
  const course = classroom.courses.find((item) => item.id === params.courseId);

  return (
    <section>
      <Link href="/student/browse" className="btn btn-link" style={{ marginBottom: 16 }}>
        <BackIcon aria-hidden="true" />
        回到課程列表
      </Link>

      <CourseDataBoundary
        skeleton={
          <div className="card detail-card" aria-hidden="true">
            <div className="skeleton" style={{ height: 22, width: "60%", marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 80, width: "100%" }} />
          </div>
        }
      >
        {!course ? (
          <div className="card empty-state">
            找不到這門課程，它可能已經被教師刪除。
            <br />
            <Link href="/student/browse" style={{ color: "var(--subtitle)", fontWeight: 800 }}>
              回到課程列表
            </Link>
          </div>
        ) : (
          <CourseDetail courseId={course.id} />
        )}
      </CourseDataBoundary>
    </section>
  );
}

function CourseDetail({ courseId }: Readonly<{ courseId: string }>) {
  const classroom = useClassroom();
  const course = classroom.courses.find((item) => item.id === courseId);

  if (!course) {
    return null;
  }

  const status = getStatus(course, classroom.now, classroom.studentEnrollments[course.id]);
  const actionable = isActionable(status.phase);
  const cancels = isCancelAction(status.phase);
  const isPending = classroom.pendingCourseId === course.id;

  return (
    <div className="card detail-card">
      <div>
        <span className="badge badge-category">{course.category}</span>
        {course.hot ? (
          <span className="badge badge-hot" style={{ marginLeft: 8 }}>
            熱門
          </span>
        ) : null}
        <h1 className="detail-card__title">{course.title}</h1>
        <div className="muted detail-card__meta">
          <span>
            {course.teacher} 老師 · {dayLabel(course.day)} {buildPeriodLabel(course.periodIndex)}
          </span>
          <span className="detail-card__meta-item">
            <LocationIcon aria-hidden="true" />
            {course.location}
          </span>
        </div>
      </div>

      <div className="detail-section">
        <h2 className="detail-section__title">課程簡介</h2>
        <p className="detail-section__body" style={{ margin: 0 }}>
          {course.description}
        </p>
      </div>

      {course.syllabus.length > 0 ? (
        <div className="detail-section">
          <h2 className="detail-section__title">課程大綱</h2>
          <div className="detail-syllabus">
            {course.syllabus.map((item) => (
              <div key={item} className="detail-syllabus__item">
                <BulletIcon className="detail-syllabus__marker" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="detail-meter">
        <div className="meter__label" style={{ fontSize: 13, marginBottom: 6 }}>
          <span>名額</span>
          <span>
            已選 <b style={{ color: "var(--text)" }}>{course.enrolled}</b> / {course.capacity}
            {course.waitlistCount > 0 ? `（候補 ${course.waitlistCount} 人）` : ""}
          </span>
        </div>
        <div
          className="meter meter--lg"
          style={{ marginBottom: 14 }}
          role="progressbar"
          aria-valuenow={course.enrolled}
          aria-valuemin={0}
          aria-valuemax={course.capacity}
          aria-label="名額"
        >
          <div
            className="meter__fill"
            data-full={course.enrolled >= course.capacity}
            style={{ width: `${getFillPct(course.enrolled, course.capacity)}%` }}
          />
        </div>
        <div className="course-card__footer">
          <span className="status-text" data-phase={status.phase} style={{ fontSize: 14 }}>
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
      </div>
    </div>
  );
}
