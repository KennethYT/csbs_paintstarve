"use client";

import { useRef } from "react";
import { CodeIcon, HeadingIcon, LinkIcon, ListIcon } from "@/components/icons";

type Selection = { next: string; cursorStart: number; cursorEnd: number };

function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, placeholder: string): Selection {
  const { selectionStart, selectionEnd, value } = el;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);

  return {
    next,
    cursorStart: selectionStart + before.length,
    cursorEnd: selectionStart + before.length + selected.length
  };
}

/** 把選取範圍涵蓋到的每一行都加上前綴（標題、清單用）。 */
function prefixLines(el: HTMLTextAreaElement, prefix: string): Selection {
  const { selectionStart, selectionEnd, value } = el;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextNewline = value.indexOf("\n", selectionEnd);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;

  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");

  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  const added = nextBlock.length - block.length;

  return {
    next,
    cursorStart: selectionStart + prefix.length,
    cursorEnd: selectionEnd + added
  };
}

type ToolbarAction = {
  label: string;
  title: string;
  glyph: React.ReactNode;
  run: (el: HTMLTextAreaElement) => Selection;
};

const ACTIONS: ToolbarAction[] = [
  { label: "粗體", title: "粗體", glyph: <b>B</b>, run: (el) => wrapSelection(el, "**", "**", "粗體文字") },
  { label: "斜體", title: "斜體", glyph: <i>I</i>, run: (el) => wrapSelection(el, "_", "_", "斜體文字") },
  {
    label: "標題",
    title: "標題",
    glyph: <HeadingIcon aria-hidden="true" />,
    run: (el) => prefixLines(el, "## ")
  },
  {
    label: "項目清單",
    title: "項目清單",
    glyph: <ListIcon aria-hidden="true" />,
    run: (el) => prefixLines(el, "- ")
  },
  {
    label: "編號清單",
    title: "編號清單",
    glyph: <span>1.</span>,
    run: (el) => prefixLines(el, "1. ")
  },
  {
    label: "連結",
    title: "連結",
    glyph: <LinkIcon aria-hidden="true" />,
    run: (el) => wrapSelection(el, "[", "](https://)", "連結文字")
  },
  {
    label: "程式碼",
    title: "行內程式碼",
    glyph: <CodeIcon aria-hidden="true" />,
    run: (el) => wrapSelection(el, "`", "`", "code")
  }
];

export function MarkdownTextarea({
  id,
  value,
  onChange,
  rows = 4,
  placeholder
}: Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const applyAction = (action: ToolbarAction) => {
    const el = ref.current;

    if (!el) return;

    const { next, cursorStart, cursorEnd } = action.run(el);
    onChange(next);

    // 先讓 React 把新的 value 套到 textarea 上，才能設定選取範圍。
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div>
      <div className="markdown-toolbar" role="toolbar" aria-label="Markdown 格式工具">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="markdown-toolbar__button"
            title={action.title}
            aria-label={action.label}
            onClick={() => applyAction(action)}
          >
            {action.glyph}
          </button>
        ))}
      </div>
      <textarea
        id={id}
        ref={ref}
        className="textarea markdown-toolbar__textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
