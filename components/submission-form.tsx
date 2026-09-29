"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from "react";
import { CloseIcon } from "@/components/icons";
import { parseHttpUrl, parseYoutubeId, SUBMISSION_IMAGE_TYPES, SUBMISSION_LIMITS } from "@/lib/gallery-constants";
import { processImage } from "@/lib/watermark";

type PickedImage = { id: number; file: File; preview: string };

const limits = SUBMISSION_LIMITS;

function Field({
  label,
  htmlFor,
  hint,
  children
}: Readonly<{ label: string; htmlFor: string; hint?: string; children: ReactNode }>) {
  return (
    <div>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="submit-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * 畫廊投稿表單。圖片在送出時才縮圖、壓水印（lib/watermark.ts），
 * 這樣改了作者署名也不用重新處理，水印一定是最後送出的署名。
 */
export function SubmissionForm({ defaultArtistName }: Readonly<{ defaultArtistName: string }>) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [artistUrl, setArtistUrl] = useState("");
  const [description, setDescription] = useState("");
  const [youtube, setYoutube] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [agree, setAgree] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nextId = useRef(0);
  const previews = useRef(new Set<string>());

  // 離開頁面時把預覽用的 object URL 都釋放掉
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const picked = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const room = limits.maxImages - images.length;

    if (picked.length > room) {
      setError(`一件作品最多 ${limits.maxImages} 張圖，多出來的沒有加進去。`);
    }

    const added = picked.slice(0, Math.max(0, room)).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      nextId.current += 1;
      return { id: nextId.current, file, preview };
    });

    setImages((current) => [...current, ...added]);
  };

  const removeImage = (id: number) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);

      if (target) {
        URL.revokeObjectURL(target.preview);
        previews.current.delete(target.preview);
      }

      return current.filter((image) => image.id !== id);
    });
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
    // 清掉讓同一個檔案可以再選一次
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const resetForm = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.preview);
      previews.current.delete(image.preview);
    });
    setTitle("");
    setDescription("");
    setYoutube("");
    setLinks([""]);
    setImages([]);
    setAgree(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const artist = artistName.trim();
    const youtubeId = youtube.trim() ? parseYoutubeId(youtube) : null;
    const filledLinks = links.map((link) => link.trim()).filter(Boolean);
    const parsedLinks = filledLinks.map(parseHttpUrl);

    if (!artist) return setError("請填寫作者署名。");
    if (artistUrl.trim() && !parseHttpUrl(artistUrl)) return setError("作者連結必須是 http(s) 開頭的網址。");
    if (youtube.trim() && !youtubeId) return setError("看不懂這個 YouTube 連結，請貼影片或 Shorts 的網址。");
    if (parsedLinks.some((link) => !link)) return setError("相關連結必須是 http(s) 開頭的網址。");
    if (!images.length && !youtubeId) return setError("請至少上傳一張圖片，或貼上 YouTube 影片連結。");
    if (!agree) return setError("請先勾選同意網站規範。");

    const form = new FormData();
    form.append("title", title.trim());
    form.append("artistName", artist);
    form.append("artistUrl", artistUrl.trim());
    form.append("description", description.trim());
    form.append("youtube", youtube.trim());
    form.append("links", JSON.stringify(parsedLinks));
    form.append("agree", "1");

    try {
      const meta = [];

      for (const [index, image] of images.entries()) {
        setBusyMessage(`壓水印中（${index + 1} / ${images.length}）…`);
        const processed = await processImage(image.file, artist);
        const ext = SUBMISSION_IMAGE_TYPES[processed.type];
        form.append(`full-${index}`, processed.full, `${index + 1}.${ext}`);
        form.append(`thumb-${index}`, processed.thumb, `${index + 1}-thumb.${ext}`);
        meta.push({ width: processed.width, height: processed.height, color: processed.color });
      }

      form.append("imageMeta", JSON.stringify(meta));
      setBusyMessage("上傳中…");

      const response = await fetch("/api/gallery/submissions", { method: "POST", body: form });
      const payload = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "投稿失敗，請稍後再試。");
        return;
      }

      resetForm();
      setSubmitted(true);
      router.refresh();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "圖片處理失敗，請換一張圖再試。");
    } finally {
      setBusyMessage(null);
    }
  };

  if (submitted) {
    return (
      <div className="card form-card submit-done" role="status">
        <p className="submit-done__title">投稿成功！作品已經公開在畫廊。</p>
        <div className="submit-done__actions">
          <Link href="/" className="btn btn-brand landing-cta">
            到畫廊看看
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => setSubmitted(false)}>
            再投一件
          </button>
        </div>
      </div>
    );
  }

  const busy = busyMessage !== null;

  return (
    <form className="card form-card" onSubmit={(event) => void handleSubmit(event)} aria-busy={busy}>
      <Field label={`圖片（最多 ${limits.maxImages} 張，多頁作品請依順序選）`} htmlFor="submit-images">
        <label
          className="submit-dropzone"
          htmlFor="submit-images"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            id="submit-images"
            type="file"
            accept="image/*"
            multiple
            className="submit-dropzone__input"
            onChange={handleFileInput}
            disabled={busy || images.length >= limits.maxImages}
          />
          <span className="submit-dropzone__text">點這裡選圖，或把圖片拖進來</span>
          <span className="submit-hint">
            送出時會自動縮圖，並壓上「© 作者署名 · 禁止 AI 學習／轉載」浮水印，跟畫廊其他作品一樣。動圖只會保留第一格。
          </span>
        </label>

        {images.length ? (
          <ol className="submit-previews">
            {images.map((image, index) => (
              <li key={image.id} className="submit-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽，不經過 next/image */}
                <img src={image.preview} alt={`第 ${index + 1} 張：${image.file.name}`} className="submit-preview__image" />
                <span className="submit-preview__index">{index + 1}</span>
                <button
                  type="button"
                  className="submit-preview__remove"
                  onClick={() => removeImage(image.id)}
                  disabled={busy}
                  aria-label={`移除第 ${index + 1} 張`}
                >
                  <CloseIcon aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </Field>

      <Field
        label="YouTube 影片連結（選填）"
        htmlFor="submit-youtube"
        hint="影片作品可以只貼連結、不附圖，畫廊會直接嵌入播放器。"
      >
        <input
          id="submit-youtube"
          className="input"
          inputMode="url"
          value={youtube}
          onChange={(event) => setYoutube(event.target.value)}
          placeholder="https://www.youtube.com/shorts/…"
          disabled={busy}
        />
      </Field>

      <div className="form-grid">
        <Field label="作者署名" htmlFor="submit-artist" hint="會顯示在作品下方，也會壓進水印。">
          <input
            id="submit-artist"
            className="input"
            required
            maxLength={limits.artistNameMax}
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            placeholder="例如：@your_handle"
            disabled={busy}
          />
        </Field>
        <Field label="作者連結（選填）" htmlFor="submit-artist-url" hint="例如推特或個人頁，作者名稱會變成連結。">
          <input
            id="submit-artist-url"
            className="input"
            inputMode="url"
            value={artistUrl}
            onChange={(event) => setArtistUrl(event.target.value)}
            placeholder="https://x.com/…"
            disabled={busy}
          />
        </Field>
      </div>

      <Field label="作品標題（選填）" htmlFor="submit-title">
        <input
          id="submit-title"
          className="input"
          maxLength={limits.titleMax}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：漆彈課夜場"
          disabled={busy}
        />
      </Field>

      <Field label="作品說明（選填）" htmlFor="submit-description">
        <textarea
          id="submit-description"
          className="textarea"
          rows={3}
          maxLength={limits.descriptionMax}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="創作理念、課堂趣事…"
          disabled={busy}
        />
      </Field>

      <Field
        label={`相關連結（選填，最多 ${limits.maxLinks} 個）`}
        htmlFor="submit-link-0"
        hint="原始貼文、雲端資料夾等，會顯示在燈箱裡。只有連結、沒有圖的話請至少附一張圖。"
      >
        <div className="submit-links">
          {links.map((link, index) => (
            <div key={index} className="submit-links__row">
              <input
                id={`submit-link-${index}`}
                className="input"
                inputMode="url"
                value={link}
                onChange={(event) =>
                  setLinks((current) => current.map((value, i) => (i === index ? event.target.value : value)))
                }
                placeholder="https://…"
                disabled={busy}
              />
              {links.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
                  disabled={busy}
                  aria-label={`移除第 ${index + 1} 個連結`}
                >
                  <CloseIcon aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
          {links.length < limits.maxLinks ? (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setLinks((current) => [...current, ""])}
              disabled={busy}
            >
              ＋ 再加一個連結
            </button>
          ) : null}
        </div>
      </Field>

      <label className="submit-agree">
        <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} disabled={busy} />
        <span>
          我確認這是我的作品或已取得作者同意，送出後會立即公開，並同意
          <Link href="/rules" target="_blank" className="rights-notice__link">
            網站規範
          </Link>
          。
        </span>
      </label>

      {error ? (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn-brand" type="submit" disabled={busy} style={{ padding: 13, fontWeight: 900 }}>
        {busyMessage ?? "送出投稿"}
      </button>
    </form>
  );
}
