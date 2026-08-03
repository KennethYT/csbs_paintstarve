"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ModalIconGraphic } from "@/components/icons";
import type {
  Course,
  CreateCoursePayload,
  EnrollmentState,
  ModalState,
  SessionUser,
  ToastState
} from "@/lib/types";

const POLL_INTERVAL_MS = 4000;
const CLOCK_INTERVAL_MS = 1000;

type LoadState = "loading" | "ready" | "error";

type ClassroomContextValue = {
  now: number;
  user: SessionUser;
  courses: Course[];
  studentEnrollments: Record<string, EnrollmentState>;
  loadState: LoadState;
  loadError: string;
  pendingCourseId: string | null;
  confirmModal: ModalState;
  toast: ToastState;
  refresh: () => Promise<void>;
  grabCourse: (courseId: string) => Promise<void>;
  cancelEnrollment: (courseId: string) => Promise<void>;
  createTeacherCourse: (payload: CreateCoursePayload) => Promise<boolean>;
  dismissConfirmModal: () => void;
};

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

type SnapshotResponse = {
  ok: boolean;
  courses?: Course[];
  enrollments?: Record<string, EnrollmentState>;
  message?: string;
};

type ActionResponse = {
  ok: boolean;
  message?: string;
  result?:
    | { status: "enrolled" }
    | { status: "waitlist"; position: number }
    | { cancelled: "enrolled" | "waitlist"; promotedUserId: string | null };
};

export function ClassroomProvider({
  user,
  initialCourses,
  initialEnrollments,
  children
}: Readonly<{
  user: SessionUser;
  initialCourses: Course[];
  initialEnrollments: Record<string, EnrollmentState>;
  children: ReactNode;
}>) {
  const [now, setNow] = useState(() => Date.now());
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [studentEnrollments, setStudentEnrollments] =
    useState<Record<string, EnrollmentState>>(initialEnrollments);
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [loadError, setLoadError] = useState("");
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message });

    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }

    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/courses", { cache: "no-store" });
      const payload = (await response.json()) as SnapshotResponse;

      if (!response.ok || !payload.ok || !payload.courses) {
        setLoadState("error");
        setLoadError(payload.message ?? "讀取課程資料失敗。");
        return;
      }

      setCourses(payload.courses);
      setStudentEnrollments(payload.enrollments ?? {});
      setLoadState("ready");
      setLoadError("");
    } catch {
      setLoadState("error");
      setLoadError("無法連線到伺服器，請檢查網路後重試。");
    }
  }, []);

  // 倒數計時用的時鐘
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  // 定期重抓，讓別人搶走的名額即時反映出來。
  // 首屏資料已由 RoleShell 在伺服器端帶進來，這裡不需要再抓一次。
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const grabCourse = useCallback(
    async (courseId: string) => {
      const course = courses.find((candidate) => candidate.id === courseId);
      setPendingCourseId(courseId);

      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
          method: "POST"
        });
        const payload = (await response.json()) as ActionResponse;

        if (!response.ok || !payload.ok) {
          showToast(payload.message ?? "搶課失敗，請稍後再試。");
          await refresh();
          return;
        }

        const result = payload.result;

        if (result && "status" in result && result.status === "waitlist") {
          setConfirmModal({
            icon: "waitlist",
            title: "已加入候補",
            body: `「${course?.title ?? "課程"}」目前候補排序第 ${result.position} 位，有人退選時將依序遞補。`
          });
        } else {
          setConfirmModal({
            icon: "success",
            title: "搶課成功",
            body: `已為你保留「${course?.title ?? "課程"}」的座位，可至「我的課表」查看。`
          });
        }

        await refresh();
      } catch {
        showToast("搶課失敗，請檢查網路後再試。");
      } finally {
        setPendingCourseId(null);
      }
    },
    [courses, refresh, showToast]
  );

  const cancelEnrollment = useCallback(
    async (courseId: string) => {
      const course = courses.find((candidate) => candidate.id === courseId);
      setPendingCourseId(courseId);

      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
          method: "DELETE"
        });
        const payload = (await response.json()) as ActionResponse;

        if (!response.ok || !payload.ok) {
          showToast(payload.message ?? "取消失敗，請稍後再試。");
          await refresh();
          return;
        }

        const result = payload.result;
        const wasWaitlist = result && "cancelled" in result && result.cancelled === "waitlist";

        setConfirmModal({
          icon: "removed",
          title: wasWaitlist ? "已取消候補" : "已取消選課",
          body: wasWaitlist
            ? `已取消「${course?.title ?? "課程"}」的候補資格。`
            : `已取消「${course?.title ?? "課程"}」選課，你可以重新搶課或改選其他課程。`
        });

        await refresh();
      } catch {
        showToast("取消失敗，請檢查網路後再試。");
      } finally {
        setPendingCourseId(null);
      }
    },
    [courses, refresh, showToast]
  );

  const createTeacherCourse = useCallback(
    async (payload: CreateCoursePayload) => {
      try {
        const response = await fetch("/api/courses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          showToast(result.message ?? "建立課程失敗。");
          return false;
        }

        await refresh();
        showToast("課程建立成功");
        return true;
      } catch {
        showToast("建立課程失敗，請檢查網路後再試。");
        return false;
      }
    },
    [refresh, showToast]
  );

  const dismissConfirmModal = useCallback(() => setConfirmModal(null), []);

  const value = useMemo<ClassroomContextValue>(
    () => ({
      now,
      user,
      courses,
      studentEnrollments,
      loadState,
      loadError,
      pendingCourseId,
      confirmModal,
      toast,
      refresh,
      grabCourse,
      cancelEnrollment,
      createTeacherCourse,
      dismissConfirmModal
    }),
    [
      now,
      user,
      courses,
      studentEnrollments,
      loadState,
      loadError,
      pendingCourseId,
      confirmModal,
      toast,
      refresh,
      grabCourse,
      cancelEnrollment,
      createTeacherCourse,
      dismissConfirmModal
    ]
  );

  return (
    <ClassroomContext.Provider value={value}>
      {children}
      {confirmModal ? <ConfirmModal modal={confirmModal} onDismiss={dismissConfirmModal} /> : null}
      {toast ? <div className="toast">{toast.message}</div> : null}
    </ClassroomContext.Provider>
  );
}

function ConfirmModal({ modal, onDismiss }: Readonly<{ modal: NonNullable<ModalState>; onDismiss: () => void }>) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="classroom-modal-title">
      <div className="card modal-card fade-up">
        <div className="modal-card__icon" data-icon={modal.icon}>
          <ModalIconGraphic icon={modal.icon} />
        </div>
        <div className="modal-card__title" id="classroom-modal-title">
          {modal.title}
        </div>
        <p className="modal-card__body">{modal.body}</p>
        <button className="btn btn-brand modal-card__button" onClick={onDismiss} autoFocus>
          知道了
        </button>
      </div>
    </div>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);

  if (!context) {
    throw new Error("useClassroom must be used within ClassroomProvider");
  }

  return context;
}
