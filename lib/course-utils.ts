<<<<<<< HEAD
import { dayLabels, periods, REGISTRATION_ENABLED } from "@/lib/course-constants";
import type { Course, EnrollmentState } from "@/lib/types";

export type StatusPhase = "upcoming" | "open" | "full" | "closed" | "my-enrolled" | "my-waitlist";
=======
import { dayLabels, MAX_STUDENT_ENROLLMENTS, periods } from "@/lib/course-constants";
import type { Course, EnrollmentState } from "@/lib/types";

export type StatusPhase = "upcoming" | "open" | "full" | "limit-reached" | "my-enrolled" | "my-waitlist";
>>>>>>> fa36649fb911fc04ed274feffbfe27249957c78e

export type CourseStatus = {
  phase: StatusPhase;
  label: string;
};

export function formatCountdown(ms: number) {
  if (ms <= 0) return "已開放";

  const totalSec = Math.floor(ms / 1000);

  if (totalSec > 86400) {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    return `${days}天${hours}時後開放`;
  }

  if (totalSec > 3600) {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `${hours}時${minutes}分後開放`;
  }

  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} 後開搶`;
}

/**
 * 課程對這位使用者的狀態。顏色不在這裡決定 —— 由 CSS 依 data-phase 上色
 * （見 app/globals.css 的 .status-text / .btn-status），避免把樣式寫死在邏輯裡。
 */
export function getStatus(
  course: Course,
  now: number,
  enrollment?: EnrollmentState,
  totalSelected = 0
): CourseStatus {
  if (enrollment) {
    if (enrollment.status === "enrolled") {
      return { phase: "my-enrolled", label: "已搶到" };
    }

    return { phase: "my-waitlist", label: `候補中 第${enrollment.position}位` };
  }

  if (now < course.openAt) {
    return { phase: "upcoming", label: formatCountdown(course.openAt - now) };
  }

<<<<<<< HEAD
  if (!REGISTRATION_ENABLED) {
    return { phase: "closed", label: "報名已關閉" };
=======
  if (totalSelected >= MAX_STUDENT_ENROLLMENTS) {
    return { phase: "limit-reached", label: `已達選課上限（${MAX_STUDENT_ENROLLMENTS} 門）` };
>>>>>>> fa36649fb911fc04ed274feffbfe27249957c78e
  }

  if (course.enrolled < course.capacity) {
    return { phase: "open", label: "報名中" };
  }

  return { phase: "full", label: "已額滿" };
}

export function getButtonLabel(phase: StatusPhase) {
  if (phase === "upcoming") return "尚未開放";
  if (phase === "closed") return "報名已關閉";
  if (phase === "open") return "報名";
  if (phase === "full") return "加入候補";
  if (phase === "limit-reached") return "已達上限";
  if (phase === "my-enrolled") return "取消選課";
  return "取消候補";
}

<<<<<<< HEAD
/** 尚未開放或報名已關閉時按鈕不能按，其餘都有對應動作。 */
export function isActionable(phase: StatusPhase) {
  return phase !== "upcoming" && phase !== "closed";
=======
/** 尚未開放、或已達選課上限的課程按鈕不能按，其餘都有對應動作。 */
export function isActionable(phase: StatusPhase) {
  return phase !== "upcoming" && phase !== "limit-reached";
>>>>>>> fa36649fb911fc04ed274feffbfe27249957c78e
}

export function isCancelAction(phase: StatusPhase) {
  return phase === "my-enrolled" || phase === "my-waitlist";
}

export function dayLabel(day: number) {
  return `週${dayLabels[day - 1] ?? day}`;
}

export function buildPeriodLabel(index: number) {
  return periods[index]?.time ?? "";
}

/** 把一門課的所有「星期＋節次」組合排成一行文字，例如「週一 08:10-09:00、週三 14:10-15:00」。 */
export function formatSchedule(schedule: Course["schedule"]) {
  return schedule
    .map((slot) => {
      const time = slot.periodIndex !== null ? buildPeriodLabel(slot.periodIndex) : `${slot.startTime}-${slot.endTime}`;
      return `${dayLabel(slot.day)} ${time}`;
    })
    .join("、");
}

/** 把一門課的所有上課日期排成一行文字。 */
export function formatCourseDates(courseDates: string[]) {
  return courseDates.join("、");
}

export function getFillPct(enrolled: number, capacity: number) {
  return Math.min(100, Math.round((enrolled / Math.max(capacity, 1)) * 100));
}

export type ScheduleCell = {
  courseId: string;
  title: string;
  statusLabel: string;
  phase: "enrolled" | "waitlist";
};

/**
 * 組出課表格線。同一個時段若有多門已選課程，代表撞堂 —— 這裡會全部帶出來，
 * 由畫面標示衝突，而不是默默只顯示第一門。
 */
export function getDayCells(courses: Course[], enrollments: Record<string, EnrollmentState>) {
  return periods.map((period, periodIndex) => ({
    label: period.label,
    time: period.time,
    cells: dayLabels.map<ScheduleCell[]>((_, dayIndex) => {
      const day = dayIndex + 1;

      return courses
        .filter(
          (candidate) =>
            enrollments[candidate.id] &&
            candidate.schedule.some((slot) => slot.day === day && slot.periodIndex === periodIndex)
        )
        .map((course) => {
          const enrollment = enrollments[course.id];
          const enrolled = enrollment.status === "enrolled";

          return {
            courseId: course.id,
            title: course.title,
            statusLabel: enrolled ? "已確認" : `候補第 ${enrollment.position} 位`,
            phase: enrolled ? "enrolled" : "waitlist"
          };
        });
    })
  }));
}
