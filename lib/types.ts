export type Role = "student" | "teacher";

export type CourseCategory =
  | "資訊"
  | "人文藝術"
  | "商管"
  | "自然科學"
  | "語言"
  | "社會科學"
  | "其他";

export type EnrollmentState =
  | { status: "enrolled" }
  | { status: "waitlist"; position: number };

/**
 * 一組「星期＋節次」。一門課可以有好幾組，例如週一第1節 + 週三第5節。
 * periodIndex 有值代表選的是 course-constants.ts 裡的預設節次；
 * 選「自訂時段」的話 periodIndex 是 null，改用 startTime/endTime（"HH:MM"）。
 * 兩者互斥，不會同時有值。
 */
export type CourseScheduleSlot = {
  day: number;
  periodIndex: number | null;
  startTime: string | null;
  endTime: string | null;
};

/**
 * 送到瀏覽器的課程資料。刻意不含選課學生名單 — 名單只有授課教師能透過
 * GET /api/courses/[courseId]/roster 取得，避免把全校學生姓名送到每個人的瀏覽器。
 */
export type Course = {
  id: string;
  title: string;
  teacher: string;
  teacherId: string;
  category: CourseCategory;
  /** 每週固定上課的星期＋節次組合，可以有多組 */
  schedule: CourseScheduleSlot[];
  location: string;
  description: string;
  syllabus: string[];
  capacity: number;
  /** 由 Enrollment 即時計數得出，非資料庫欄位 */
  enrolled: number;
  waitlistCount: number;
  /** epoch milliseconds */
  openAt: number;
  hot: boolean;
  /** 這門課實際上課的具體日曆日期，可以有多個且不需要規律，格式 YYYY-MM-DD */
  courseDates: string[];
  /** 這門課分成幾組上課 */
  groupCount: number;
};

export type RosterEntry = { id: string; name: string };
export type WaitlistEntry = { id: string; name: string; position: number };

export type CourseRoster = {
  courseId: string;
  enrolledStudents: RosterEntry[];
  waitlist: WaitlistEntry[];
};

export type CreateCoursePayload = {
  title: string;
  category: CourseCategory;
  description: string;
  syllabus: string[];
  schedule: CourseScheduleSlot[];
  location: string;
  capacity: number;
  openAt: number;
  courseDates: string[];
  groupCount: number;
};

export type ToastState = { message: string } | null;

/** 對話框圖示的種類，實際的圖示元件在 components/icons.tsx 對應 */
export type ModalIconKind = "success" | "waitlist" | "removed";

export type ModalState =
  | { icon: ModalIconKind; title: string; body: string }
  | null;

export type Period = {
  label: string;
  time: string;
};

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  /** 是否同時持有教師與學生兩個 Discord 身份組，可以自由切換身分 */
  canSwitchRole: boolean;
};
