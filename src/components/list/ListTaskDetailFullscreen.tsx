"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Clock,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  X,
} from "lucide-react";
import { TaskNotesMarkdown } from "@/components/list/TaskNotesMarkdown";
import { useAppStore } from "@/lib/store";
import {
  notesHtmlToPlainText,
  plainTextToNotesHtml,
} from "@/lib/task-notes-format";

type Props = {
  taskId: string;
  title: string;
  notesHtml: string;
  onClose: () => void;
};

function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const hasSelection = start !== end;
  const selected = hasSelection
    ? textarea.value.slice(start, end)
    : placeholder;
  const next =
    textarea.value.slice(0, start) +
    before +
    selected +
    after +
    textarea.value.slice(end);
  const cursorPos = start + before.length + selected.length + after.length;
  textarea.value = next;
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.focus();
}

function insertLinePrefix(textarea: HTMLTextAreaElement, prefix: string) {
  const pos = textarea.selectionStart;
  const text = textarea.value;
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const next =
    text.slice(0, lineStart) + prefix + text.slice(lineStart);
  textarea.value = next;
  const cursorPos = lineStart + prefix.length;
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.focus();
}

function insertPlainText(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart;
  const next =
    textarea.value.slice(0, start) + text + textarea.value.slice(start);
  textarea.value = next;
  const cursorPos = start + text.length;
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.focus();
}

export function ListTaskDetailFullscreen({
  taskId,
  title,
  notesHtml,
  onClose,
}: Props) {
  const [mdSource, setMdSource] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mdSourceRef = useRef(mdSource);
  mdSourceRef.current = mdSource;

  useEffect(() => {
    setMdSource(notesHtmlToPlainText(notesHtml));
  }, [notesHtml, taskId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const save = useCallback(() => {
    const html = plainTextToNotesHtml(mdSourceRef.current.trim());
    useAppStore.getState().updateTask(taskId, {
      result: html || undefined,
    });
  }, [taskId]);

  const handleClose = useCallback(() => {
    save();
    onClose();
  }, [save, onClose]);

  const handleMdChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMdSource(e.target.value);
    },
    [],
  );

  const applyTool = useCallback(
    (fn: (ta: HTMLTextAreaElement) => void) => {
      const ta = textareaRef.current;
      if (!ta) return;
      fn(ta);
      setMdSource(ta.value);
    },
    [],
  );

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--md-sys-color-surface)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--md-sys-color-outline)]/70 px-6 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-md-on-surface">
          {title}
        </h2>
        <button
          type="button"
          title="保存并关闭"
          aria-label="保存并关闭"
          className="md-btn-filled md-focus-ring flex items-center gap-1.5 px-4 py-2 md-type-body-s"
          onClick={handleClose}
        >
          保存
        </button>
        <button
          type="button"
          title="关闭"
          aria-label="关闭全屏"
          className="md-btn-tonal md-focus-ring p-2"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-r border-[var(--md-sys-color-outline)]/50">
          <div className="shrink-0 border-b border-[var(--md-sys-color-outline)]/30 px-4 py-1.5">
            <span className="md-type-label-s text-md-on-surface-variant">
              Markdown 编辑
            </span>
          </div>
          <div
            className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-[var(--md-sys-color-outline)]/30 px-3 py-1.5"
            role="toolbar"
            aria-label="Markdown 格式"
          >
            <MdToolBtn
              title="标题"
              onClick={() =>
                applyTool((ta) => insertLinePrefix(ta, "## "))
              }
            >
              <Heading className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="加粗"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "**", "**", "加粗"))
              }
            >
              <Bold className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="高亮"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "==", "==", "高亮"))
              }
            >
              <span className="text-xs font-serif font-bold leading-none">A</span>
            </MdToolBtn>
            <MdToolDivider />
            <MdToolBtn
              title="待办列表"
              onClick={() =>
                applyTool((ta) => insertLinePrefix(ta, "- [ ] "))
              }
            >
              <ListChecks className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="无序列表"
              onClick={() =>
                applyTool((ta) => insertLinePrefix(ta, "- "))
              }
            >
              <List className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="有序列表"
              onClick={() =>
                applyTool((ta) => insertLinePrefix(ta, "1. "))
              }
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolDivider />
            <MdToolBtn
              title="斜体"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "*", "*", "斜体"))
              }
            >
              <Italic className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="下划线"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "<u>", "</u>", "下划线"))
              }
            >
              <Underline className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="删除线"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "~~", "~~", "删除"))
              }
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="代码"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "`", "`", "code"))
              }
            >
              <Code className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="时间戳"
              onClick={() =>
                applyTool((ta) => insertPlainText(ta, new Date().toLocaleString()))
              }
            >
              <Clock className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolDivider />
            <MdToolBtn
              title="链接"
              onClick={() =>
                applyTool((ta) => insertTextAtCursor(ta, "[", "](url)", "链接文字"))
              }
            >
              <Link className="h-3.5 w-3.5" />
            </MdToolBtn>
            <MdToolBtn
              title="引用"
              onClick={() =>
                applyTool((ta) => insertLinePrefix(ta, "> "))
              }
            >
              <Quote className="h-3.5 w-3.5" />
            </MdToolBtn>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent px-6 py-4 font-mono md-type-body-m leading-relaxed text-md-on-surface outline-none placeholder:text-md-on-surface-variant"
            placeholder="像写日记一样记录…"
            value={mdSource}
            onChange={handleMdChange}
            onBlur={save}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--md-sys-color-outline)]/30 px-4 py-1.5">
            <span className="md-type-label-s text-md-on-surface-variant">
              预览
            </span>
          </div>
          <div className="scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TaskNotesMarkdown source={mdSource} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MdToolBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="md-focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-md-on-surface-variant md-state-hover-subtle"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MdToolDivider() {
  return (
    <span
      className="mx-0.5 h-4 w-px shrink-0 bg-[var(--md-sys-color-outline)]/70"
      aria-hidden
    />
  );
}