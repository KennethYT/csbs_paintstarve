"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GLOBAL_OPEN_AT, GLOBAL_OPEN_AT_LABEL, categories, dayLabels, periods } from "@/lib/course-constants";
import type { Course, CourseScheduleSlot } from "@/lib/types";
import { useClassroom } from "@/components/classroom-store";
import { CourseDataBoundary } from "@/components/course-states";
import { BackIcon } from "@/components/icons";
import { MarkdownTextarea } from "@/components/markdown-editor";

/** 用本地時間組出 YYYY-MM-DD，避免 toISOString() 轉 UTC 造成日期跑掉一天。 */
function todayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TeacherEditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const classroom = useClassroom();
  const course = classroom.courses.find((candidate) => candidate.id === params.courseId);

  return (
    <section style={{ maxWidth: 640 }}>
      <Link href="/teacher/courses" className="btn btn-link" style={{ marginBottom: 16 }}>
        <BackIcon aria-hidden="true" />
        回到我的課程
      </Link>
      <h1 className="section-title" style={{ marginBottom: 20 }}>
        編輯課程
      </h1>

      <CourseDataBoundary>
        {course ? (
          course.teacherId === classroom.user.id ? (
            <EditCourseForm course={course} />
          ) : (
            <div className="card empty-state">你沒有權限編輯這門課程。</div>
          )
        ) : (
          <div className="card empty-state">找不到這門課程。</div>
        )}
      </CourseDataBoundary>
    </section>
  );
}

function EditCourseForm({ course }: Readonly<{ course: Course }>) {
  const classroom = useClassroom();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    title: course.title,
    category: course.category,
    brief: course.description,
    syllabus: course.syllabus.join("\n"),
    schedule: course.schedule as CourseScheduleSlot[],
    location: course.location,
    capacity: course.capacity,
    courseDates: course.courseDates,
    groupCount: course.groupCount
  }));

  const updateScheduleSlot = (index: number, patch: Partial<CourseScheduleSlot>) => {
    setForm((current) => ({
      ...current,
      schedule: current.schedule.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot))
    }));
  };

  const addScheduleSlot = () => {
    setForm((current) => ({
      ...current,
      schedule: [...current.schedule, { day: 1, periodIndex: 0, startTime: null, endTime: null }]
    }));
  };

  const removeScheduleSlot = (index: number) => {
    setForm((current) => ({
      ...current,
      schedule:
        current.schedule.length > 1 ? current.schedule.filter((_, slotIndex) => slotIndex !== index) : current.schedule
    }));
  };

  const updateCourseDate = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      courseDates: current.courseDates.map((date, dateIndex) => (dateIndex === index ? value : date))
    }));
  };

  const addCourseDate = () => {
    setForm((current) => ({ ...current, courseDates: [...current.courseDates, todayLocalDate()] }));
  };

  const removeCourseDate = (index: number) => {
    setForm((current) => ({
      ...current,
      courseDates:
        current.courseDates.length > 1
          ? current.courseDates.filter((_, dateIndex) => dateIndex !== index)
          : current.courseDates
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("請輸入課程名稱。");
      return;
    }

    setIsSubmitting(true);

    const updated = await classroom.updateTeacherCourse(course.id, {
      title: form.title.trim(),
      category: form.category,
      schedule: form.schedule,
      location: form.location.trim() || "教室未定",
      description: form.brief.trim() || "課程簡介尚未提供。",
      syllabus: form.syllabus
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      capacity: form.capacity,
      openAt: GLOBAL_OPEN_AT,
      courseDates: form.courseDates,
      groupCount: form.groupCount
    });

    setIsSubmitting(false);

    if (updated) {
      router.push("/teacher/courses");
    }
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <Field label="課程名稱" htmlFor="course-title">
        <input
          id="course-title"
          className="input"
          required
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="例如：資料結構與演算法"
        />
      </Field>

      <Field label="課程簡介（支援 Markdown）" htmlFor="course-brief">
        <MarkdownTextarea
          id="course-brief"
          rows={3}
          value={form.brief}
          onChange={(value) => setForm((current) => ({ ...current, brief: value }))}
          placeholder="一段簡短的課程介紹"
        />
      </Field>

      <Field label="課程大綱（每行一項，支援 Markdown）" htmlFor="course-syllabus">
        <MarkdownTextarea
          id="course-syllabus"
          rows={4}
          value={form.syllabus}
          onChange={(value) => setForm((current) => ({ ...current, syllabus: value }))}
          placeholder={"第一週：課程介紹\n第二週：…"}
        />
      </Field>

      <Field label="上課星期與節次（可新增多組）" htmlFor="course-schedule-day-0">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.schedule.map((slot, index) => (
            <div key={index} style={{ display: "flex", gap: 8 }}>
              <select
                id={index === 0 ? "course-schedule-day-0" : undefined}
                className="select"
                value={slot.day}
                onChange={(event) => updateScheduleSlot(index, { day: Number(event.target.value) })}
              >
                {dayLabels.map((label, dayIndex) => (
                  <option key={label} value={dayIndex + 1}>
                    週{label}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={slot.periodIndex === null ? "custom" : slot.periodIndex}
                onChange={(event) => {
                  const { value } = event.target;

                  if (value === "custom") {
                    updateScheduleSlot(index, { periodIndex: null, startTime: "08:00", endTime: "09:00" });
                  } else {
                    updateScheduleSlot(index, { periodIndex: Number(value), startTime: null, endTime: null });
                  }
                }}
              >
                {periods.map((period, periodIndex) => (
                  <option key={period.label} value={periodIndex}>
                    {period.label}（{period.time}）
                  </option>
                ))}
                <option value="custom">自訂時段…</option>
              </select>
              {slot.periodIndex === null ? (
                <>
                  <input
                    className="input"
                    type="time"
                    required
                    value={slot.startTime ?? ""}
                    onChange={(event) => updateScheduleSlot(index, { startTime: event.target.value })}
                  />
                  <input
                    className="input"
                    type="time"
                    required
                    value={slot.endTime ?? ""}
                    onChange={(event) => updateScheduleSlot(index, { endTime: event.target.value })}
                  />
                </>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeScheduleSlot(index)}
                disabled={form.schedule.length <= 1}
              >
                移除
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addScheduleSlot} style={{ alignSelf: "flex-start" }}>
            + 新增星期／節次
          </button>
        </div>
      </Field>

      <Field label="上課日期（可新增多個）" htmlFor="course-date-0">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.courseDates.map((date, index) => (
            <div key={index} style={{ display: "flex", gap: 8 }}>
              <input
                id={index === 0 ? "course-date-0" : undefined}
                className="input"
                type="date"
                required
                value={date}
                onChange={(event) => updateCourseDate(index, event.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeCourseDate(index)}
                disabled={form.courseDates.length <= 1}
              >
                移除
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addCourseDate} style={{ alignSelf: "flex-start" }}>
            + 新增日期
          </button>
        </div>
      </Field>

      <div className="form-grid">
        <Field label="分類" htmlFor="course-category">
          <select
            id="course-category"
            className="select"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Course["category"] }))}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>

        <Field label="上課地點" htmlFor="course-location">
          <input
            id="course-location"
            className="input"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder="例如：管理學院 302"
          />
        </Field>

        <Field label="名額" htmlFor="course-capacity">
          <input
            id="course-capacity"
            className="input"
            type="number"
            min={1}
            max={500}
            value={form.capacity}
            onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) || 1 }))}
          />
        </Field>

        <Field label="組數" htmlFor="course-group-count">
          <input
            id="course-group-count"
            className="input"
            type="number"
            min={1}
            max={100}
            value={form.groupCount}
            onChange={(event) => setForm((current) => ({ ...current, groupCount: Number(event.target.value) || 1 }))}
          />
        </Field>

        <Field label="報名開放時間" htmlFor="course-open-at">
          <div id="course-open-at" className="input" style={{ color: "var(--muted)", cursor: "default" }}>
            {GLOBAL_OPEN_AT_LABEL}（全站課程統一開放，無法個別設定）
          </div>
        </Field>
      </div>

      {error ? (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn-brand" type="submit" disabled={isSubmitting} style={{ padding: 13, fontWeight: 900 }}>
        {isSubmitting ? "儲存中…" : "儲存變更"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children
}: Readonly<{ label: string; htmlFor: string; children: React.ReactNode }>) {
  return (
    <div>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
