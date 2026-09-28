"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import { CloseIcon, NextIcon, PagesIcon, PlayIcon, PrevIcon } from "@/components/icons";
import type { GalleryArtist, GalleryWork } from "@/lib/gallery";

/** 燈箱裡的一頁：所有作品的所有圖片攤平成一條，左右鍵可以一路翻到下一件作品。 */
type Slide = { work: GalleryWork; imageIndex: number };

const SWIPE_THRESHOLD = 50;

/**
 * 圖片上擋掉右鍵選單（另存圖片）。只是增加一點門檻、擋不了截圖，
 * 真正的保護是壓在圖檔裡的水印。
 */
function blockImageContextMenu(event: MouseEvent) {
  if ((event.target as HTMLElement).tagName === "IMG") {
    event.preventDefault();
  }
}

function artistNames(artists: GalleryArtist[]) {
  return artists.map((artist) => artist.name).join("、");
}

function ArtistLinks({ artists }: Readonly<{ artists: GalleryArtist[] }>) {
  return artists.map((artist, index) => (
    <span key={artist.name}>
      {index > 0 ? "、" : null}
      {artist.url ? (
        <a href={artist.url} target="_blank" rel="noopener noreferrer" className="lightbox__artist-link">
          {artist.name}
        </a>
      ) : (
        artist.name
      )}
    </span>
  ));
}

/**
 * 首頁畫廊：瀑布流格線 + 燈箱。
 *
 * 圖片一律 unoptimized：public/gallery 裡已經是縮好的 webp，而部署到 Workers 後
 * /_next/image 不會真的壓縮（沒有 IMAGES binding），只是多繞一趟 Worker。
 *
 * 燈箱用原生 <dialog> + showModal()：背景自動 inert、Esc 關閉、關閉後焦點回到原本的縮圖，
 * 這些都由瀏覽器處理，不用自己寫 focus trap。
 */
export function Gallery({ works }: Readonly<{ works: GalleryWork[] }>) {
  const [current, setCurrent] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);

  const { slides, firstSlideOf } = useMemo(() => {
    const allSlides: Slide[] = [];
    const firstSlide: number[] = [];

    for (const work of works) {
      firstSlide.push(allSlides.length);
      work.images.forEach((_, imageIndex) => allSlides.push({ work, imageIndex }));
    }

    return { slides: allSlides, firstSlideOf: firstSlide };
  }, [works]);

  const slide = current === null ? null : slides[current];

  // state 是唯一的真相，這裡只負責把 <dialog> 的開關同步過去
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (current !== null && !dialog.open) {
      dialog.showModal();
    } else if (current === null && dialog.open) {
      dialog.close();
    }
  }, [current]);

  // 預先載入前後兩張，翻漫畫時不會每頁都等
  useEffect(() => {
    if (current === null || slides.length < 2) {
      return;
    }

    for (const offset of [1, -1]) {
      const { work, imageIndex } = slides[(current + offset + slides.length) % slides.length];
      const preload = new window.Image();
      preload.src = work.images[imageIndex].src;
    }
  }, [current, slides]);

  const step = (offset: number) => {
    setCurrent((index) => (index === null ? null : (index + offset + slides.length) % slides.length));
  };

  const close = () => setCurrent(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  };

  // 點圖片以外的空白處關閉（dialog 本身與標了 data-backdrop 的外框都算空白處）
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    const target = event.target as HTMLElement;

    if (target === event.currentTarget || target.dataset.backdrop !== undefined) {
      close();
    }
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      step(deltaX > 0 ? -1 : 1);
    }
  };

  const image = slide ? slide.work.images[slide.imageIndex] : null;
  const pageCount = slide ? slide.work.images.length : 0;

  return (
    <>
      <ul className="gallery" aria-label="作品列表" onContextMenu={blockImageContextMenu}>
        {works.map((work, workIndex) => {
          const cover = work.images[0];

          return (
            <li key={work.id} className="gallery__item">
              <button type="button" className="gallery__card" onClick={() => setCurrent(firstSlideOf[workIndex])}>
                <span className="gallery__thumb" style={{ backgroundColor: cover.color }}>
                  <Image
                    src={cover.thumb}
                    alt=""
                    width={cover.width}
                    height={cover.height}
                    unoptimized
                    draggable={false}
                    className="gallery__image"
                  />
                  {work.youtube ? (
                    <span className="gallery__badge">
                      <PlayIcon aria-hidden="true" />
                      影片
                    </span>
                  ) : work.images.length > 1 ? (
                    <span className="gallery__badge">
                      <PagesIcon aria-hidden="true" />
                      {work.images.length} 張
                    </span>
                  ) : null}
                </span>
                <span className="gallery__caption">
                  {work.title ? <span className="gallery__title">{work.title}</span> : null}
                  <span className="gallery__artist">{artistNames(work.artists)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-labelledby="lightbox-caption"
        onClose={close}
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={blockImageContextMenu}
      >
        {slide && image ? (
          <div className="lightbox__layout" data-backdrop>
            <button type="button" className="lightbox__button lightbox__close" onClick={close} aria-label="關閉">
              <CloseIcon aria-hidden="true" />
            </button>

            <div className="lightbox__stage" data-backdrop>
              {slides.length > 1 ? (
                <button
                  type="button"
                  className="lightbox__button lightbox__nav lightbox__nav--prev"
                  onClick={() => step(-1)}
                  aria-label="上一張"
                >
                  <PrevIcon aria-hidden="true" />
                </button>
              ) : null}

              {slide.work.youtube ? (
                // 影片作品直接嵌 YouTube 官方播放器（nocookie 網域），影片不另存在本站
                <iframe
                  key={slide.work.youtube}
                  src={`https://www.youtube-nocookie.com/embed/${slide.work.youtube}?rel=0&playsinline=1`}
                  title={`${slide.work.title ?? "影片作品"} — ${artistNames(slide.work.artists)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="lightbox__video"
                />
              ) : (
                <Image
                  key={image.src}
                  src={image.src}
                  alt={[slide.work.title, image.caption].filter(Boolean).join("：") || `${artistNames(slide.work.artists)} 的作品`}
                  width={image.width}
                  height={image.height}
                  unoptimized
                  loading="eager"
                  draggable={false}
                  className="lightbox__image"
                  style={{ backgroundColor: image.color }}
                />
              )}

              {slides.length > 1 ? (
                <button
                  type="button"
                  className="lightbox__button lightbox__nav lightbox__nav--next"
                  onClick={() => step(1)}
                  aria-label="下一張"
                >
                  <NextIcon aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="lightbox__caption" id="lightbox-caption">
              {slide.work.title ? <div className="lightbox__title">{slide.work.title}</div> : null}
              <div className="lightbox__meta">
                <ArtistLinks artists={slide.work.artists} />
                {slide.work.note ? <span className="lightbox__note">{slide.work.note}</span> : null}
              </div>
              {pageCount > 1 || image.caption ? (
                <div className="lightbox__page">
                  {pageCount > 1 ? (
                    <span className="lightbox__counter">
                      {slide.imageIndex + 1} / {pageCount}
                    </span>
                  ) : null}
                  {image.caption}
                </div>
              ) : null}
              <div className="lightbox__rights">
                © 作者保留所有權利 · 禁止 AI 學習、轉載與商用 ·{" "}
                <Link href="/rules" className="lightbox__artist-link">
                  網站規範
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
