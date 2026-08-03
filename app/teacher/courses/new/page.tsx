"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories, dayLabels, periods } from "@/lib/course-constants";
import type { CourseCategory, OpenMode } from "@/lib/types";
import { useClassroom } from "@/components/classroom-store";
import { BackIcon } from "@/components/icons";

function resolveOpenAt(mode: OpenMode) {
  const now = Date.now();

  if (mode === "now") return now - 1000;
  if (mode === "soon") return now + 30_000;
  return now + 24 * 3600 * 1000;
}

export default function TeacherCreateCoursePage() {
  const classroom = useClassroom();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "資訊" as CourseCategory,
    brief: "",
    syllabus: "",
    day: 1,
    periodIndex: 0,
    location: "",
    capacity: 30,
    openMode: "now" as OpenMode
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("請輸入課程名稱。");
      return;
    }

    setIsSubmitting(true);

    const created = await classroom.createTeacherCourse({
      title: form.title.trim(),
      category: form.category,
      day: form.day,
      periodIndex: form.periodIndex,
      location: form.location.trim() || "教室未定",
      description: form.brief.trim() || "課程簡介尚未提供。",
      syllabus: form.syllabus
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      capacity: form.capacity,
      openAt: resolveOpenAt(form.openMode)
    });

    setIsSubmitting(false);

    if (created) {
      router.push("/teacher/courses");
    }
  };

  return (
    <section style={{ maxWidth: 640 }}>
      <Link href="/teacher/courses" className="btn btn-link" style={{ marginBottom: 16 }}>
        <BackIcon aria-hidden="true" />
        回到我的課程
      </Link>
      <h1 className="section-title" style={{ marginBottom: 20 }}>
        建立課程
      </h1>

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

        <Field label="課程簡介" htmlFor="course-brief">
          <textarea
            id="course-brief"
            className="textarea"
            rows={3}
            value={form.brief}
            onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
            placeholder="一段簡短的課程介紹"
          />
        </Field>

        <Field label="課程大綱（每行一項）" htmlFor="course-syllabus">
          <textarea
            id="course-syllabus"
            className="textarea"
            rows={4}
            value={form.syllabus}
            onChange={(event) => setForm((current) => ({ ...current, syllabus: event.target.value }))}
            placeholder={"第一週：課程介紹\n第二週：…"}
          />
        </Field>

        <div className="form-grid">
          <Field label="分類" htmlFor="course-category">
            <select
              id="course-category"
              className="select"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value as CourseCategory }))
              }
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

          <Field label="上課星期" htmlFor="course-day">
            <select
              id="course-day"
              className="select"
              value={form.day}
              onChange={(event) => setForm((current) => ({ ...current, day: Number(event.target.value) }))}
            >
              {dayLabels.map((label, index) => (
                <option key={label} value={index + 1}>
                  週{label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="上課節次" htmlFor="course-period">
            <select
              id="course-period"
              className="select"
              value={form.periodIndex}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodIndex: Number(event.target.value) }))
              }
            >
              {periods.map((period, index) => (
                <option key={period.label} value={index}>
                  {period.label}（{period.time}）
                </option>
              ))}
            </select>
          </Field>

          <Field label="名額" htmlFor="course-capacity">
            <input
              id="course-capacity"
              className="input"
              type="number"
              min={1}
              max={500}
              value={form.capacity}
              onChange={(event) =>
                setForm((current) => ({ ...current, capacity: Number(event.target.value) || 1 }))
              }
            />
          </Field>

          <Field label="搶課開放時間" htmlFor="course-open">
            <select
              id="course-open"
              className="select"
              value={form.openMode}
              onChange={(event) =>
                setForm((current) => ({ ...current, openMode: event.target.value as OpenMode }))
              }
            >
              <option value="now">立即開放</option>
              <option value="soon">30 秒後開放（示範倒數）</option>
              <option value="tomorrow">明日開放</option>
            </select>
          </Field>
        </div>

        {error ? (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="btn btn-brand"
          type="submit"
          disabled={isSubmitting}
          style={{ padding: 13, fontWeight: 900 }}
        >
          {isSubmitting ? "建立中…" : "建立課程"}
        </button>
      </form>
    </section>
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
