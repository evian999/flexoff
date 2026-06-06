"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Calendar,
  Clock,
  Code,
  Flag,
  Heading,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  MoreHorizontal,
  Paperclip,
  Plus,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import type { Folder, Tag, Task, TaskPriority, TodoEdge } from "@/lib/types";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  RECENT_DELETED_FOLDER_KEY,
  taskFolderKey,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { TagBadge } from "@/components/TagBadge";
import { TagHashTextInput } from "@/components/TagHashTextInput";
import { normalizeMentionList } from "@/lib/mentions";
import { findNextTaskFromEdges } from "@/lib/list-task-next";
import { nextTaskPreviewLabel } from "@/lib/list-task-next";
import {
  listCheckboxStyle,
} from "@/lib/task-priority-ui";
import { useScrollbarAutoHide } from "@/hooks/useScrollbarAutoHide";
import { TaskNotesEditor } from "@/components/list/TaskNotesEditor";
import {
  getCaretTextOffset,
  insertLinkAtSelection,
  notesHtmlToPlainText,
  plainTextToNotesHtml,
  restoreCaretAtOffset,
  wrapSelectionWithTag,
  type NotesWrapTag,
} from "@/lib/task-notes-format";

const PRIORITY_FLAG: Record<
  TaskPriority,
  { title: string; className: string }
> = {
  high: { title: "高优先级", className: "text-red-500" },
  medium: { title: "中优先级", className: "text-amber-400" },
  low: { title: "低优先级", className: "text-sky-400" },
};

type Props = {
  task: Task;
  tags: Tag[];
  folders: Folder[];
  edges: TodoEdge[];
  incompleteTasks: Task[];
  completedTasks: Task[];
  isEditingTitle: boolean;
  titleDraft: string;
  onTitleDraftChange: (v: string) => void;
  onStartEditTitle: (taskId: string, title: string) => void;
  onCancelTitleEdit: () => void;
  onSaveTitleFromBlur: (taskId: string, draft: string) => void;
  onRequestCompleteDialog: (t: Task) => void;
  onRequestAbandon: (t: Task) => void;
  jumpToTask: (t: Task) => void;
  onClose: () => void;
};

function formatDueMeta(task: Task) {
  if (!task.dueAt) return null;
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const dateLabel = `${due.getFullYear()}/${String(due.getMonth() + 1).padStart(2, "0")}/${String(due.getDate()).padStart(2, "0")}`;
  if (task.completedAt || task.abandonedAt) {
    return { dateLabel, overdueDays: 0, isOverdue: false };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const overdueDays = Math.floor(
    (today.getTime() - dueDay.getTime()) / 86_400_000,
  );
  return {
    dateLabel,
    overdueDays: overdueDays > 0 ? overdueDays : 0,
    isOverdue: overdueDays > 0,
  };
}

function folderLabel(task: Task, folders: Folder[]) {
  const fk = taskFolderKey(task);
  if (fk === INBOX_FOLDER_KEY) return "收件箱";
  if (fk === ARCHIVE_FOLDER_KEY) return "归档";
  if (fk === RECENT_DELETED_FOLDER_KEY) return "最近删除";
  return folders.find((f) => f.id === fk)?.name ?? "文件夹";
}

function folderColor(task: Task, folders: Folder[]) {
  const fk = taskFolderKey(task);
  if (fk === RECENT_DELETED_FOLDER_KEY) return "#f87171";
  if (fk === ARCHIVE_FOLDER_KEY) return "#a1a1aa";
  if (fk === INBOX_FOLDER_KEY) return "var(--accent)";
  return folders.find((f) => f.id === fk)?.color ?? "var(--accent)";
}

export function ListTaskDetailPanel({
  task,
  tags,
  folders,
  edges,
  incompleteTasks,
  completedTasks,
  isEditingTitle,
  titleDraft,
  onTitleDraftChange,
  onStartEditTitle,
  onCancelTitleEdit,
  onSaveTitleFromBlur,
  onRequestCompleteDialog,
  onRequestAbandon,
  jumpToTask,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dueInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  useScrollbarAutoHide(scrollRef);

  const [notesDraft, setNotesDraft] = useState(task.result ?? "");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionDraft, setMentionDraft] = useState("");
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(false);
  const [moreBox, setMoreBox] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [priorityBox, setPriorityBox] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    setNotesDraft(task.result ?? "");
  }, [task.id, task.result]);

  const dueMeta = useMemo(() => formatDueMeta(task), [task]);
  const nextLink = useMemo(
    () => findNextTaskFromEdges(task, edges, incompleteTasks, completedTasks),
    [task, edges, incompleteTasks, completedTasks],
  );

  const taskTags = useMemo(
    () =>
      (task.tagIds ?? [])
        .map((id) => tags.find((t) => t.id === id))
        .filter(Boolean) as Tag[],
    [task.tagIds, tags],
  );

  const openMoreMenu = useCallback((anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    setMoreBox({ top: r.top - 4, left: Math.max(8, r.right - 160) });
    setMoreOpen(true);
  }, []);

  const openPriorityMenu = useCallback((anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    setPriorityBox({ top: r.bottom + 4, left: Math.max(8, r.right - 160) });
    setPriorityOpen(true);
  }, []);

  useEffect(() => {
    if (!moreOpen && !priorityOpen && !tagPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        t instanceof Element &&
        (t.closest("[data-detail-menu]") ||
          t.closest("[data-tag-picker]"))
      ) {
        return;
      }
      setMoreOpen(false);
      setPriorityOpen(false);
      setTagPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [moreOpen, priorityOpen, tagPickerOpen]);

  const saveNotes = () => {
    const html = notesDraft.trim();
    const plain = notesHtmlToPlainText(html).trim();
    useAppStore.getState().updateTask(task.id, {
      result: plain ? html : undefined,
    });
  };

  const setPriority = (p: TaskPriority | undefined) => {
    useAppStore.getState().updateTask(task.id, { priority: p });
    setPriorityOpen(false);
  };

  const commitMention = () => {
    const raw = mentionDraft.trim().replace(/^@+/, "");
    if (raw) {
      const next = normalizeMentionList([...(task.mentions ?? []), raw]);
      useAppStore.getState().updateTask(task.id, { mentions: next });
    }
    setMentionOpen(false);
    setMentionDraft("");
  };

  const applyNotesWrap = useCallback(
    (before: string, after: string = before, placeholder = "") => {
      const el = notesRef.current;
      if (!el) return;

      const wrapTags: Record<string, NotesWrapTag> = {
        "**": "strong",
        "*": "em",
        "~~": "del",
        "==": "mark",
        "`": "code",
      };

      if (before === "<u>" && after === "</u>") {
        setNotesDraft(wrapSelectionWithTag(el, "u", placeholder));
        return;
      }

      if (before === "[" && after === "](url)") {
        setNotesDraft(insertLinkAtSelection(el, placeholder));
        return;
      }

      const tag = wrapTags[before];
      if (tag && after === before) {
        setNotesDraft(wrapSelectionWithTag(el, tag, placeholder));
        return;
      }

      el.focus();
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      sel.getRangeAt(0).deleteContents();
      sel.getRangeAt(0).insertNode(document.createTextNode(before + placeholder + after));
      sel.collapseToEnd();
      const offset = getCaretTextOffset(el);
      const plain = el.innerText;
      el.innerHTML = plainTextToNotesHtml(plain);
      restoreCaretAtOffset(el, offset);
      setNotesDraft(el.innerHTML);
    },
    [],
  );

  const applyNotesLinePrefix = useCallback((prefix: string) => {
    const el = notesRef.current;
    if (!el) return;
    el.focus();
    const offset = getCaretTextOffset(el);
    const text = el.innerText;
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
    const next = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    el.innerHTML = plainTextToNotesHtml(next);
    restoreCaretAtOffset(el, offset + prefix.length);
    setNotesDraft(el.innerHTML);
  }, []);

  const insertNotesText = useCallback((text: string) => {
    const el = notesRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    sel.getRangeAt(0).deleteContents();
    sel.getRangeAt(0).insertNode(document.createTextNode(text));
    sel.collapseToEnd();
    setNotesDraft(el.innerHTML);
  }, []);

  const toggleFormatToolbar = useCallback(() => {
    setFormatToolbarOpen((open) => {
      const next = !open;
      if (next) notesRef.current?.focus();
      return next;
    });
  }, []);

  const inTrash = task.folderId === RECENT_DELETED_FOLDER_KEY;
  const done = Boolean(task.completedAt || task.abandonedAt);
  const pri = task.priority;
  const priFlag = pri ? PRIORITY_FLAG[pri] : null;

  return (
    <aside
      className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-l border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)]"
      aria-label="任务详情"
    >
      {/* 顶栏：完成框 · 截止日期 · 优先级旗标 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--md-sys-color-outline)]/70 px-4 py-3">
        <input
          type="checkbox"
          className="h-[22px] w-[22px] shrink-0 cursor-pointer rounded-md border-2 appearance-none transition-colors"
          style={listCheckboxStyle(
            Boolean(task.completedAt),
            task.priority,
            Boolean(task.abandonedAt),
          )}
          checked={done}
          onChange={(e) => {
            if (e.target.checked) {
              if (inTrash) return;
              onRequestCompleteDialog(task);
            } else {
              useAppStore.getState().uncompleteTask(task.id);
            }
          }}
          title="完成 / 还原"
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {dueMeta ? (
            <>
              <Calendar
                className={`h-4 w-4 shrink-0 ${dueMeta.isOverdue ? "text-red-500" : "text-md-on-surface-variant"}`}
                aria-hidden
              />
              <button
                type="button"
                className={`md-focus-ring truncate text-left md-type-body-s ${dueMeta.isOverdue ? "text-red-500" : "text-md-on-surface-variant"}`}
                onClick={() => dueInputRef.current?.showPicker?.()}
              >
                {dueMeta.dateLabel}
                {dueMeta.isOverdue ? (
                  <span className="ml-1.5">延期{dueMeta.overdueDays}天</span>
                ) : null}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 md-type-body-s text-md-primary md-focus-ring rounded-sm"
              onClick={() => {
                useAppStore.getState().updateTask(task.id, {
                  dueAt: new Date(Date.now() + 86_400_000).toISOString(),
                });
              }}
            >
              <Calendar className="h-4 w-4" />
              添加日期
            </button>
          )}
          <input
            ref={dueInputRef}
            type="datetime-local"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            value={
              task.dueAt
                ? task.dueAt.includes("T")
                  ? task.dueAt.slice(0, 16)
                  : `${task.dueAt.slice(0, 10)}T00:00`
                : ""
            }
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                useAppStore.getState().updateTask(task.id, { dueAt: undefined });
                return;
              }
              useAppStore.getState().updateTask(task.id, {
                dueAt: new Date(v).toISOString(),
              });
            }}
          />
        </div>
        <button
          type="button"
          title={priFlag?.title ?? "设置优先级"}
          aria-label={priFlag?.title ?? "设置优先级"}
          className="md-focus-ring shrink-0 p-1"
          onClick={(e) => {
            if (priorityOpen) setPriorityOpen(false);
            else openPriorityMenu(e.currentTarget);
          }}
        >
          <Flag
            className={`h-5 w-5 ${priFlag?.className ?? "text-md-on-surface-variant/40"}`}
            fill={pri ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* 标题 */}
      <div className="shrink-0 px-4 pb-2 pt-4">
        <div className="min-w-0">
          {isEditingTitle ? (
            <TagHashTextInput
              className="md-field md-focus-ring w-full border-0 bg-transparent px-0 py-0 text-xl font-semibold leading-snug text-md-on-surface outline-none"
              placeholder="任务标题…"
              value={titleDraft}
              onChange={onTitleDraftChange}
              tags={tags}
              autoFocus
              onInputBlur={() => onSaveTitleFromBlur(task.id, titleDraft)}
              onInputKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") onCancelTitleEdit();
              }}
            />
          ) : (
            <button
              type="button"
              className={`w-full text-left text-xl font-semibold leading-snug md-focus-ring rounded-sm ${
                done
                  ? "text-md-on-surface-variant line-through"
                  : "text-md-on-surface"
              }`}
              onClick={() => onStartEditTitle(task.id, task.title)}
            >
              {task.title}
            </button>
          )}
        </div>
      </div>

      {/* 标签行 */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 pb-3">
        {taskTags.map((tg) => (
          <TagBadge
            key={tg.id}
            tag={tg}
            tagIndex={tags.findIndex((x) => x.id === tg.id)}
            onRemove={() =>
              useAppStore.getState().toggleTaskTag(task.id, tg.id)
            }
          />
        ))}
        <div className="relative" data-tag-picker>
          <button
            type="button"
            title="添加标签"
            aria-label="添加标签"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-md-primary/50 text-md-primary md-focus-ring hover:bg-md-primary/10"
            onClick={() => setTagPickerOpen((o) => !o)}
          >
            <Plus className="h-4 w-4" />
          </button>
          {tagPickerOpen ? (
            <div
              className="absolute left-0 top-full z-30 mt-1 max-h-40 min-w-[9rem] overflow-y-auto border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] py-1 md-corner-md shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              {tags
                .filter((t) => !task.tagIds?.includes(t.id))
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left md-type-body-s text-md-on-surface md-state-hover"
                    onClick={() => {
                      useAppStore.getState().toggleTaskTag(task.id, t.id);
                      setTagPickerOpen(false);
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              {tags.filter((t) => !task.tagIds?.includes(t.id)).length ===
              0 ? (
                <p className="px-3 py-2 md-type-body-s text-md-on-surface-variant">
                  暂无更多标签
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 备注 / 详情主内容区 */}
      <div
        ref={scrollRef}
        className="scrollbar-auto-hide relative min-h-0 flex-1 overflow-y-auto px-4 pb-2"
      >
        <TaskNotesEditor
          taskId={task.id}
          value={notesDraft}
          editorRef={notesRef}
          onChange={setNotesDraft}
          onBlur={saveNotes}
        />

        {(task.mentions ?? []).length > 0 || mentionOpen ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--md-sys-color-outline)]/50 pt-3">
            {(task.mentions ?? []).map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-0.5 rounded-full bg-[var(--md-sys-color-secondary-container)]/35 px-2 py-0.5 md-type-label-m text-md-on-surface"
              >
                @{m}
                <button
                  type="button"
                  className="rounded-full p-0.5 text-md-on-surface-variant hover:bg-black/10 md-focus-ring"
                  title="移除提及"
                  onClick={() => {
                    const next = (task.mentions ?? []).filter(
                      (x) => x.toLowerCase() !== m.toLowerCase(),
                    );
                    useAppStore.getState().updateTask(task.id, {
                      mentions: next.length ? next : undefined,
                    });
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {mentionOpen ? (
              <input
                className="md-field md-focus-ring w-28 px-2 py-0.5 md-type-body-s"
                placeholder="@名字"
                value={mentionDraft}
                autoFocus
                onChange={(e) => setMentionDraft(e.target.value)}
                onBlur={commitMention}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitMention();
                  }
                  if (e.key === "Escape") {
                    setMentionOpen(false);
                    setMentionDraft("");
                  }
                }}
              />
            ) : null}
          </div>
        ) : null}

        {nextLink?.next ? (
          <div className="mt-4 border-t border-[var(--md-sys-color-outline)]/50 pt-3 md-type-body-s">
            <span className="text-md-on-surface-variant">下一个任务 </span>
            <button
              type="button"
              className="text-md-primary underline-offset-2 hover:underline md-focus-ring rounded-sm"
              onClick={() => jumpToTask(nextLink.next!)}
            >
              {nextTaskPreviewLabel(nextLink.next.title)}
            </button>
          </div>
        ) : null}

        {task.abandonedAt ? (
          <div className="mt-4 md-corner-sm border border-amber-800/40 bg-amber-950/20 px-3 py-2 md-type-body-s">
            <p className="text-md-on-surface-variant">放弃原因</p>
            <p className="mt-1 whitespace-pre-wrap text-amber-100/90">
              {task.abandonReason?.trim() || "（未填写）"}
            </p>
          </div>
        ) : null}
      </div>

      {formatToolbarOpen ? (
        <div
          data-format-toolbar
          className="flex shrink-0 flex-wrap items-center justify-center gap-0.5 border-t border-[var(--md-sys-color-outline)]/70 bg-[var(--md-sys-color-surface-container)] px-3 py-2"
          role="toolbar"
          aria-label="文本格式"
        >
          <FormatBtn title="标题" onClick={() => applyNotesLinePrefix("## ")}>
            <Heading className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="加粗"
            onClick={() => applyNotesWrap("**", "**", "加粗")}
          >
            <Bold className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="高亮"
            active
            onClick={() => applyNotesWrap("==", "==", "高亮")}
          >
            <span className="text-sm font-serif font-bold leading-none">A</span>
          </FormatBtn>
          <FormatDivider />
          <FormatBtn
            title="待办列表"
            onClick={() => applyNotesLinePrefix("- [ ] ")}
          >
            <ListChecks className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="无序列表"
            onClick={() => applyNotesLinePrefix("- ")}
          >
            <List className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="有序列表"
            onClick={() => applyNotesLinePrefix("1. ")}
          >
            <ListOrdered className="h-4 w-4" />
          </FormatBtn>
          <FormatDivider />
          <FormatBtn
            title="斜体"
            onClick={() => applyNotesWrap("*", "*", "斜体")}
          >
            <Italic className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="下划线"
            onClick={() => applyNotesWrap("<u>", "</u>", "下划线")}
          >
            <Underline className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="删除线"
            onClick={() => applyNotesWrap("~~", "~~", "删除")}
          >
            <Strikethrough className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="代码"
            onClick={() => applyNotesWrap("`", "`", "code")}
          >
            <Code className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="时间戳"
            onClick={() => insertNotesText(new Date().toLocaleString())}
          >
            <Clock className="h-4 w-4" />
          </FormatBtn>
          <FormatDivider />
          <FormatBtn
            title="链接"
            onClick={() => applyNotesWrap("[", "](url)", "链接文字")}
          >
            <Link className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="引用"
            onClick={() => applyNotesLinePrefix("> ")}
          >
            <Quote className="h-4 w-4" />
          </FormatBtn>
          <FormatBtn
            title="附件占位"
            onClick={() => applyNotesWrap("", "", "[附件]")}
          >
            <Paperclip className="h-4 w-4" />
          </FormatBtn>
        </div>
      ) : null}

      {/* 底栏：文件夹 · 快捷操作 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-sm"
            style={{ backgroundColor: folderColor(task, folders) }}
            aria-hidden
          />
          {inTrash ? (
            <span className="truncate md-type-body-s text-md-on-surface-variant">
              {folderLabel(task, folders)}
            </span>
          ) : (
            <select
              className="max-w-[10rem] appearance-none truncate border-0 bg-transparent py-0 pl-0 pr-2 md-type-body-s text-md-on-surface outline-none md-focus-ring"
              value={task.folderId ?? ""}
              onChange={(e) =>
                useAppStore.getState().setTaskFolder(
                  task.id,
                  e.target.value ? e.target.value : undefined,
                )
              }
            >
              <option value="">收件箱</option>
              <option value={ARCHIVE_FOLDER_KEY}>归档</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            data-format-trigger
            title="文本格式"
            aria-label="文本格式"
            className={`md-focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] md-type-body-m font-serif font-bold ${
              formatToolbarOpen
                ? "bg-amber-400/25 text-amber-500"
                : "text-md-on-surface-variant md-btn-tonal"
            }`}
            onClick={toggleFormatToolbar}
          >
            A
          </button>
          <button
            type="button"
            title="添加 @提及"
            aria-label="添加 @提及"
            className="md-btn-tonal md-focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] md-type-body-m font-semibold text-md-on-surface-variant"
            onClick={() => {
              setMentionOpen(true);
              setMentionDraft("");
            }}
          >
            @
          </button>
          <button
            type="button"
            title="更多"
            aria-label="更多"
            className="md-btn-tonal md-focus-ring p-2"
            onClick={(e) => {
              if (moreOpen) setMoreOpen(false);
              else openMoreMenu(e.currentTarget);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {priorityOpen && priorityBox && typeof document !== "undefined"
        ? createPortal(
            <ul
              data-detail-menu
              className="fixed z-[10000] min-w-[10rem] border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] py-1 md-corner-md shadow-lg"
              style={{ top: priorityBox.top, left: priorityBox.left }}
              role="listbox"
            >
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left md-type-body-s md-state-hover md-focus-ring"
                  onClick={() => setPriority(undefined)}
                >
                  <Flag className="h-3.5 w-3.5 text-md-on-surface-variant" />
                  无优先级
                </button>
              </li>
              {(Object.keys(PRIORITY_FLAG) as TaskPriority[]).map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left md-type-body-s md-state-hover md-focus-ring"
                    onClick={() => setPriority(p)}
                  >
                    <Flag
                      className={`h-3.5 w-3.5 ${PRIORITY_FLAG[p].className}`}
                      fill="currentColor"
                    />
                    {PRIORITY_FLAG[p].title}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}

      {moreOpen && moreBox && typeof document !== "undefined"
        ? createPortal(
            <ul
              data-detail-menu
              className="fixed z-[10000] min-w-[10rem] border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] py-1 md-corner-md shadow-lg"
              style={{
                top: moreBox.top,
                left: moreBox.left,
                transform: "translateY(-100%)",
              }}
            >
              <li>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left md-type-body-s md-state-hover md-focus-ring"
                  onClick={() => {
                    onStartEditTitle(task.id, task.title);
                    setMoreOpen(false);
                  }}
                >
                  编辑标题
                </button>
              </li>
              {!done && !inTrash ? (
                <li>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left md-type-body-s text-amber-500 md-state-hover md-focus-ring"
                    onClick={() => {
                      onRequestAbandon(task);
                      setMoreOpen(false);
                    }}
                  >
                    放弃任务
                  </button>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left md-type-body-s text-red-400 md-state-hover md-focus-ring"
                  onClick={() => {
                    useAppStore.getState().deleteTask(task.id);
                    setMoreOpen(false);
                    onClose();
                  }}
                >
                  {inTrash ? "永久删除" : "删除任务"}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left md-type-body-s md-state-hover md-focus-ring"
                  onClick={() => {
                    setMoreOpen(false);
                    onClose();
                  }}
                >
                  关闭详情
                </button>
              </li>
            </ul>,
            document.body,
          )
        : null}
    </aside>
  );
}

function FormatDivider() {
  return (
    <span
      className="mx-0.5 h-5 w-px shrink-0 bg-[var(--md-sys-color-outline)]/70"
      aria-hidden
    />
  );
}

function FormatBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`md-focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-md-on-surface-variant md-state-hover-subtle ${
        active ? "bg-amber-400/25 text-amber-500" : ""
      }`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
