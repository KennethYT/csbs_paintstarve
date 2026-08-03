export type Role = "student" | "teacher";

export type CourseCategory =
  | "資訊"
  | "人文藝術"
  | "商管"
  | "自然科學"
  | "語言"
  | "社會科學"
  | "其他";

export type OpenMode = "now" | "soon" | "tomorrow";

export type EnrollmentState =
  | { status: "enrolled" }
  | { status: "waitlist"; position: number };

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
  day: number;
  periodIndex: number;
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
  day: number;
  periodIndex: number;
  location: string;
  capacity: number;
  openAt: number;
};

export type CreateCourseForm = {
  title: string;
  category: CourseCategory;
  brief: string;
  syllabus: string;
  day: number;
  periodIndex: number;
  location: string;
  capacity: number;
  openMode: OpenMode;
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
};
