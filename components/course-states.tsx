"use client";

import { useClassroom } from "@/components/classroom-store";

/** 課程卡片的載入骨架 */
export function CourseGridSkeleton({ count = 6 }: Readonly<{ count?: number }>) {
  return (
    <div className="grid-auto" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card skeleton-card">
          <div className="skeleton" style={{ height: 18, width: "70%" }} />
          <div className="skeleton" style={{ height: 13, width: "50%" }} />
          <div className="skeleton" style={{ height: 6, width: "100%" }} />
          <div className="skeleton" style={{ height: 34, width: "100%" }} />
        </div>
      ))}
    </div>
  );
}

/**
 * 統一處理載入中與載入失敗兩種狀態。資料好了就 render children。
 */
export function CourseDataBoundary({
  skeleton,
  children
}: Readonly<{ skeleton?: React.ReactNode; children: React.ReactNode }>) {
  const { loadState, loadError, refresh } = useClassroom();

  if (loadState === "loading") {
    return <>{skeleton ?? <CourseGridSkeleton />}</>;
  }

  if (loadState === "error") {
    return (
      <div className="error-state" role="alert">
        <span>{loadError || "讀取課程資料失敗。"}</span>
        <button className="btn btn-brand" style={{ padding: "10px 20px", fontWeight: 900 }} onClick={() => void refresh()}>
          重新載入
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
