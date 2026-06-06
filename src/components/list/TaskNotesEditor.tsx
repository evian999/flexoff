"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import {
  matchInlineFormatBeforeSpace,
  notesSourceToHtml,
} from "@/lib/task-notes-format";

const PLACEHOLDER = "添加备注、实验记录或复盘…";

type Props = {
  taskId: string;
  value: string;
  onChange: (html: string) => void;
  onBlur: () => void;
  editorRef?: React.RefObject<HTMLDivElement | null>;
};

function isEmptyHtml(html: string): boolean {
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return !text;
}

function placeCaretAfter(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function applyInlineFormatAtCaret(root: HTMLDivElement): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return false;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;

  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const before = text.slice(0, offset);
  const match = matchInlineFormatBeforeSpace(before);
  if (!match) return false;

  const after = text.slice(offset);
  const doc = root.ownerDocument;
  const parent = node.parentNode;
  if (!parent) return false;

  const prefixNode = match.prefix ? doc.createTextNode(match.prefix) : null;
  const el = doc.createElement(match.tag);
  el.textContent = match.content;
  const spaceNode = doc.createTextNode("\u00a0");
  const afterNode = after ? doc.createTextNode(after) : null;

  if (prefixNode) parent.insertBefore(prefixNode, node);
  parent.insertBefore(el, node);
  parent.insertBefore(spaceNode, node);
  if (afterNode) parent.insertBefore(afterNode, node);
  parent.removeChild(node);

  placeCaretAfter(spaceNode);
  return true;
}

export function TaskNotesEditor({
  taskId,
  value,
  onChange,
  onBlur,
  editorRef: externalRef,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const editorRef = externalRef ?? internalRef;
  const hydratedTaskId = useRef<string | null>(null);
  const skipSync = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (hydratedTaskId.current !== taskId) {
      hydratedTaskId.current = taskId;
      skipSync.current = true;
      el.innerHTML = notesSourceToHtml(value);
      skipSync.current = false;
    }
  }, [taskId, value, editorRef]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el || skipSync.current) return;
    onChange(el.innerHTML);
  }, [editorRef, onChange]);

  const handleInput = () => {
    emitChange();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== " ") return;
    const el = editorRef.current;
    if (!el) return;
    if (applyInlineFormatAtCaret(el)) {
      e.preventDefault();
      emitChange();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    sel.deleteFromDocument();
    sel.getRangeAt(0).insertNode(document.createTextNode(text));
    sel.collapseToEnd();
    emitChange();
  };

  const empty = isEmptyHtml(value);

  return (
    <div className="relative min-h-[12rem] w-full">
      {empty ? (
        <p
          className="pointer-events-none absolute inset-x-0 top-0 py-1 text-[0.875rem] leading-relaxed text-md-on-surface-variant"
          aria-hidden
        >
          {PLACEHOLDER}
        </p>
      ) : null}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="任务备注"
        data-placeholder={PLACEHOLDER}
        className="min-h-[12rem] w-full py-1 md-type-body-m leading-relaxed text-md-on-surface outline-none [&_a]:text-md-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-md-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-md-on-surface-variant [&_code]:rounded [&_code]:bg-[var(--md-sys-color-surface-container-highest)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-amber-400/30 [&_mark]:px-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
        onInput={handleInput}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}
