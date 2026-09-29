"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayIcon } from "@/components/icons";
import type { SubmissionSummary } from "@/lib/gallery-submissions";

/**
 * 投稿清單。/submit 顯示自己的投稿；/manage（admin）顯示全部投稿並提供下架／恢復。
 * 只有管理員可以下架，投稿者本人不能自行刪除（要下架請找管理員，見網站規範）。
 */
export function SubmissionList({
  items,
  admin = false
}: Readonly<{ items: SubmissionSummary[] | null; admin?: boolean }>) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (items === null) {
    return <div className="error-state">讀取投稿失敗，請重新整理再試一次。</div>;
  }

  if (!items.length) {
    return <div className="card empty-state">{admin ? "還沒有人投稿。" : "你還沒有投稿過作品。"}</div>;
  }

  const setStatus = async (item: SubmissionSummary, status: "removed" | "published") => {
    const name = item.title ?? `${item.artistName} 的作品`;

    if (status === "removed" && !window.confirm(`確定要下架「${name}」嗎？下架後會從畫廊移除，之後可以再恢復。`)) {
      return;
    }

    setError("");
    setPendingId(item.id);

    try {
      const response = await fetch(`/api/gallery/submissions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "更新失敗，請稍後再試。");
        return;
      }

      router.refresh();
    } catch {
      setError("更新失敗，請檢查網路後再試。");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      {error ? (
        <p className="auth-message auth-message--error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      <ul className="submission-list">
        {items.map((item) => {
          const removed = item.status === "removed";

          return (
            <li key={item.id} className="card submission-item" data-status={item.status}>
              <div className="submission-item__thumb" style={{ backgroundColor: item.cover.color }}>
                {/* 下架後圖檔已經搬走，讀不到，改顯示文字 */}
                {removed && item.cover.src.startsWith("/uploads/") ? (
                  <span className="submission-item__placeholder">已下架</span>
                ) : (
                  <Image
                    src={item.cover.thumb}
                    alt=""
                    width={item.cover.width}
                    height={item.cover.height}
                    unoptimized
                    className="submission-item__image"
                  />
                )}
              </div>
              <div className="submission-item__body">
                <div className="submission-item__title">{item.title ?? "（無標題）"}</div>
                <div className="submission-item__meta">
                  {item.artistName}
                  {admin ? <> · 投稿者 {item.uploaderName}</> : null}
                </div>
                <div className="submission-item__meta">
                  {item.createdAtLabel}
                  {item.imageCount ? ` · ${item.imageCount} 張圖` : ""}
                  {item.youtubeId ? (
                    <>
                      {" · "}
                      <PlayIcon aria-hidden="true" /> 影片
                    </>
                  ) : null}
                </div>
              </div>
              <div className="submission-item__side">
                <span className="badge submission-item__status" data-status={item.status}>
                  {removed ? (admin ? "已下架" : "已被管理員下架") : "公開中"}
                </span>
                {admin ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void setStatus(item, removed ? "published" : "removed")}
                    disabled={pendingId !== null}
                  >
                    {pendingId === item.id ? "處理中…" : removed ? "恢復上架" : "下架"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
