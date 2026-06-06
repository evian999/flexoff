"use client";

import { memo, useRef, useState } from "react";
import {
  ArchiveRestore,
  Ban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Folder, Tag, Task, TodoEdge } from "@/lib/types";
import {
  ARCHIVE_FOLDER_KEY,
  RECENT_DELETED_FOLDER_KEY,
  taskFolderKey,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { TagBadge } from "@/components/TagBadge";
import { TagHashTextInput } from "@/components/TagHashTextInput";
import { normalizeMentionList } from "@/lib/mentions";
import { listCheckboxStyle } from "@/lib/task-priority-ui";
import { nextTaskPreviewLabel } from "@/lib/list-task-next";
import type { ListDensity } from "@/lib/list-ui-prefs";

export type ListTaskRowProps = {
  density: ListDensity;
  /** list：紧凑列表行；panel：右侧详情面板 */
  display?: "list" | "panel";
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  task: Task;
  serial: number;
  nextInList?: Task;
  nextSerial?: number;
  isFlashing: boolean;
  tags: Tag[];
  folders: Folder[];
  allTasks: Task[];
  edges: TodoEdge[];
  isEditingTitle: boolean;
  titleDraft: string;
  onTitleDraftChange: (v: string) => void;
  onStartEditTitle: (taskId: string, title: string) => void;
  onCancelTitleEdit: () => void;
  onSaveTitleFromBlur: (taskId: string, draft: string) => void;
  editingTaskId: string | null;
  onRequestCompleteDialog: (t: Task) => void;
  onRequestAbandon: (t: Task) => void;
  jumpToTask: (t: Task) => void;
  registerCardRef: (id: string, el: HTMLElement | null) => void;
  /** 虚拟列表时用 div+listitem，避免 ul 内嵌套绝对定位 li 结构问题 */
  listElement?: "li" | "div";
};

function listTaskRowPropsEqual(
  a: ListTaskRowProps,
  b: ListTaskRowProps,
): boolean {
  return (
    a.task === b.task &&
    a.serial === b.serial &&
    (a.nextInList?.id ?? "") === (b.nextInList?.id ?? "") &&
    (a.nextSerial ?? -1) === (b.nextSerial ?? -1) &&
    a.isFlashing === b.isFlashing &&
    a.tags === b.tags &&
    a.folders === b.folders &&
    a.allTasks === b.allTasks &&
    a.edges === b.edges &&
    a.isEditingTitle === b.isEditingTitle &&
    a.titleDraft === b.titleDraft &&
    a.editingTaskId === b.editingTaskId &&
    a.density === b.density &&
    (a.display ?? "list") === (b.display ?? "list") &&
    a.selected === b.selected &&
    a.onSelect === b.onSelect &&
    (a.listElement ?? "li") === (b.listElement ?? "li")
  );
}

function ListTaskRowInner({
  density,
  display = "list",
  selected = false,
  onSelect,
  task,
  serial,
  nextInList,
  nextSerial,
  isFlashing,
  tags,
  folders,
  allTasks,
  edges,
  isEditingTitle,
  titleDraft,
  onTitleDraftChange,
  onStartEditTitle,
  onCancelTitleEdit,
  onSaveTitleFromBlur,
  editingTaskId,
  onRequestCompleteDialog,
  onRequestAbandon,
  jumpToTask,
  registerCardRef,
  listElement = "li",
}: ListTaskRowProps) {
  const skipNextTitleBlurSave = useRef(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionDraft, setMentionDraft] = useState("");
  const [resultEditing, setResultEditing] = useState(false);
  const [resultDraft, setResultDraft] = useState("");

  const isCompact = density === "compact" && display === "list";
  const showFull = display === "panel" || density === "comfortable";

  const commitMention = () => {
    const raw = mentionDraft.trim().replace(/^@+/, "");
    if (raw) {
      const next = normalizeMentionList([...(task.mentions ?? []), raw]);
      useAppStore.getState().updateTask(task.id, { mentions: next });
    }
    setMentionOpen(false);
    setMentionDraft("");
  };

  if (isCompact && !showFull) {
    const Root = listElement === "div" ? "div" : "li";
    return (
      <Root
        id={`list-task-${task.id}`}
        role={listElement === "div" ? "listitem" : undefined}
        ref={(el: HTMLLIElement | HTMLDivElement | null) =>
          registerCardRef(task.id, el)
        }
        className={`list-task-row-cv list-task-row-cv-compact group flex w-full min-h-[44px] flex-row items-center gap-2 border bg-[var(--md-sys-color-surface-container)] px-2 py-1.5 md-corner-md ${
          selected
            ? "border-md-primary ring-2 ring-md-primary/25"
            : "border-[var(--md-sys-color-outline)]"
        } ${isFlashing ? "list-task-target-flash" : ""}`}
        style={{ boxShadow: "var(--md-sys-elevation-shadow-1)" }}
      >
        <span className="w-6 shrink-0 text-right tabular-nums md-type-label-m text-md-on-surface-variant">
          {serial}.
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-2 appearance-none transition-colors"
          style={listCheckboxStyle(
            Boolean(task.completedAt),
            task.priority,
            Boolean(task.abandonedAt),
          )}
          checked={Boolean(task.completedAt || task.abandonedAt)}
          onChange={(e) => {
            if (e.target.checked) {
              if (task.folderId === RECENT_DELETED_FOLDER_KEY) return;
              onRequestCompleteDialog(task);
            } else {
              useAppStore.getState().uncompleteTask(task.id);
            }
          }}
          title="完成 / 还原"
        />
        <div
          role="button"
          tabIndex={0}
          className="min-w-0 flex-1 cursor-pointer truncate text-left md-type-body-m font-medium text-md-on-surface md-focus-ring rounded-sm"
          onClick={() => onSelect?.(task.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(task.id);
            }
          }}
        >
          <span
            className={
              task.completedAt || task.abandonedAt
                ? "text-md-on-surface-variant line-through"
                : ""
            }
          >
            {task.title}
          </span>
        </div>
        <div className="list-row-hover-actions flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="md-focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] text-md-on-surface-variant hover:text-md-primary"
            title="编辑标题"
            aria-label="编辑标题"
            onClick={() => {
              onSelect?.(task.id);
              skipNextTitleBlurSave.current = false;
              onStartEditTitle(task.id, task.title);
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!task.completedAt &&
          !task.abandonedAt &&
          task.folderId !== RECENT_DELETED_FOLDER_KEY ? (
            <button
              type="button"
              className="md-focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] text-amber-500/90 hover:bg-amber-500/10"
              title="放弃"
              aria-label="放弃任务"
              onClick={() => onRequestAbandon(task)}
            >
              <Ban className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="md-focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] text-md-on-surface-variant hover:text-red-400"
            title="删除"
            aria-label="删除任务"
            onClick={() => useAppStore.getState().deleteTask(task.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Root>
    );
  }

  const Root = listElement === "div" ? "div" : "li";
  return (
    <Root
      id={`list-task-${task.id}`}
      role={listElement === "div" ? "listitem" : undefined}
      ref={(el: HTMLLIElement | HTMLDivElement | null) =>
        registerCardRef(task.id, el)
      }
      className={`list-task-row-cv group flex w-full flex-col gap-2 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] p-4 md-corner-md ${
        display === "panel" ? "" : "sm:flex-row sm:items-start"
      } ${isFlashing ? "list-task-target-flash" : ""}`}
      style={{ boxShadow: "var(--md-sys-elevation-shadow-1)" }}
    >
      {display === "list" ? (
        <span
          className="mt-0.5 w-7 shrink-0 text-right tabular-nums md-type-body-s text-md-on-surface-variant sm:mt-1"
          title="列表序号（自上而下；新任务在上）"
        >
          {serial}.
        </span>
      ) : null}
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-2 appearance-none transition-colors"
        style={listCheckboxStyle(
          Boolean(task.completedAt),
          task.priority,
          Boolean(task.abandonedAt),
        )}
        title={
          task.abandonedAt
            ? "已放弃（×）"
            : task.completedAt
              ? "已完成"
              : task.priority === undefined
                ? "未完成（无优先级）"
                : "未完成时边框颜色表示优先级（红/黄/蓝=高/中/低）"
        }
        checked={Boolean(task.completedAt || task.abandonedAt)}
        onChange={(e) => {
          if (e.target.checked) {
            if (task.folderId === RECENT_DELETED_FOLDER_KEY) return;
            onRequestCompleteDialog(task);
          } else {
            useAppStore.getState().uncompleteTask(task.id);
          }
        }}
      />
      <div className="min-w-0 flex-1">
        {isEditingTitle ? (
          <div className="relative w-full min-w-0">
            <TagHashTextInput
              className="md-field md-focus-ring w-full px-2 py-1.5 md-type-body-m"
              placeholder="标题…（用 # 选择标签，回车结束编辑）"
              value={titleDraft}
              onChange={onTitleDraftChange}
              tags={tags}
              suggestAbove
              autoFocus
              onInputBlur={() => {
                if (skipNextTitleBlurSave.current) {
                  skipNextTitleBlurSave.current = false;
                  return;
                }
                onSaveTitleFromBlur(task.id, titleDraft);
              }}
              onInputKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  skipNextTitleBlurSave.current = true;
                  onCancelTitleEdit();
                }
              }}
            />
          </div>
        ) : (
          <p
            className={`md-type-body-m font-medium ${
              task.completedAt || task.abandonedAt
                ? "text-md-on-surface-variant line-through"
                : "text-md-on-surface"
            }`}
          >
            {task.title}
          </p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 md-type-body-s text-md-on-surface-variant">
          <span title="创建时间">
            创建 {new Date(task.createdAt).toLocaleString()}
          </span>
          {task.dueAt ? (
            <label className="inline-flex items-center gap-1">
              <span>截止</span>
              <input
                type="datetime-local"
                className="md-field md-focus-ring max-w-[11rem] rounded px-1 py-0.5 md-type-body-s"
                value={
                  task.dueAt.includes("T")
                    ? task.dueAt.slice(0, 16)
                    : task.dueAt.slice(0, 10) + "T00:00"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    useAppStore.getState().updateTask(task.id, { dueAt: undefined });
                    return;
                  }
                  const iso = new Date(v).toISOString();
                  useAppStore.getState().updateTask(task.id, { dueAt: iso });
                }}
              />
            </label>
          ) : !task.completedAt && !task.abandonedAt ? (
            <button
              type="button"
              className="text-md-primary underline-offset-2 hover:underline md-focus-ring rounded-sm"
              onClick={() =>
                useAppStore.getState().updateTask(task.id, {
                  dueAt: new Date(Date.now() + 86400000).toISOString(),
                })
              }
            >
              + 截止时间
            </button>
          ) : null}
        </div>
        {!task.completedAt && !task.abandonedAt ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 md-type-body-s">
            <label className="inline-flex items-center gap-1.5">
              <span className="text-md-on-surface-variant">进度</span>
              <input
                type="number"
                min={0}
                className="md-field w-14 rounded px-1 py-0.5 text-center"
                value={task.progressCurrent ?? ""}
                placeholder="0"
                onChange={(e) => {
                  const v = e.target.value;
                  useAppStore.getState().updateTask(task.id, {
                    progressCurrent: v === "" ? undefined : Math.max(0, Number(v)),
                  });
                }}
              />
              <span>/</span>
              <input
                type="number"
                min={0}
                className="md-field w-14 rounded px-1 py-0.5 text-center"
                value={task.progressTotal ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  useAppStore.getState().updateTask(task.id, {
                    progressTotal: v === "" ? undefined : Math.max(0, Number(v)),
                  });
                }}
              />
            </label>
            {task.progressTotal != null &&
            task.progressTotal > 0 &&
            task.progressCurrent != null ? (
              <div
                className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-[var(--md-sys-color-surface-container-highest)]"
                title="完成进度"
              >
                <div
                  className="h-full bg-md-primary transition-[width]"
                  style={{
                    width: `${Math.min(100, Math.round((task.progressCurrent / task.progressTotal) * 100))}%`,
                  }}
                />
              </div>
            ) : null}
            <div className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                id={`list-sr-cb-${task.id}`}
                className="h-3.5 w-3.5 accent-md-primary"
                checked={task.spacedRepetitionEnabled === true}
                onChange={(e) =>
                  useAppStore.getState().updateTask(task.id, {
                    spacedRepetitionEnabled: e.target.checked ? true : undefined,
                  })
                }
              />
              <label
                htmlFor={`list-sr-cb-${task.id}`}
                className="cursor-pointer select-none text-md-on-surface-variant"
              >
                遗忘曲线重复
              </label>
            </div>
          </div>
        ) : null}
        <div className="mt-2 flex min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-0">
          {task.folderId === RECENT_DELETED_FOLDER_KEY ? (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 md-type-label-m">
              <span className="text-md-on-surface-variant">最近删除的任务</span>
              <button
                type="button"
                className="md-btn-tonal md-focus-ring inline-flex items-center gap-1 px-2 py-1 md-type-body-s"
                title="恢复到删除前所在文件夹"
                onClick={() =>
                  useAppStore.getState().restoreTaskFromTrash(task.id)
                }
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                恢复
              </button>
            </div>
          ) : (
            <label className="flex min-w-0 max-w-full shrink-0 items-center gap-1 md-type-label-m">
              文件夹
              <select
                className="md-field md-focus-ring px-2 py-1 md-type-body-s text-md-on-surface md-corner-sm"
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
            </label>
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-1 border-t border-[var(--md-sys-color-outline)] pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 md-type-body-s">
            <span className="shrink-0 text-md-on-surface-variant">下一个任务</span>
            {nextInList && nextSerial != null ? (
              <>
                <span
                  className="shrink-0 tabular-nums text-md-on-surface"
                  title="下一任务在列表中的序号"
                >
                  {nextSerial}
                </span>
                <button
                  type="button"
                  className="min-w-0 max-w-[11em] overflow-hidden text-ellipsis whitespace-nowrap text-left text-md-primary underline-offset-2 hover:underline md-focus-ring rounded-sm"
                  title={nextInList.title}
                  onClick={() => jumpToTask(nextInList)}
                >
                  {nextTaskPreviewLabel(nextInList.title)}
                </button>
                {editingTaskId !== nextInList.id ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-sm p-1 text-md-on-surface-variant md-state-hover-subtle hover:text-md-primary md-focus-ring"
                    title="编辑下一任务标题"
                    onClick={() => {
                      skipNextTitleBlurSave.current = false;
                      onStartEditTitle(nextInList.id, nextInList.title);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </>
            ) : (
              <span className="shrink-0 text-md-on-surface-variant">—</span>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(task.tagIds ?? [])
            .map((id) => tags.find((t) => t.id === id))
            .filter(Boolean)
            .map((tg) => (
              <TagBadge
                key={tg!.id}
                tag={tg!}
                tagIndex={tags.findIndex((x) => x.id === tg!.id)}
                onRemove={() =>
                  useAppStore.getState().toggleTaskTag(task.id, tg!.id)
                }
              />
            ))}
          {tags.some((t) => !task.tagIds?.includes(t.id)) ? (
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--md-sys-color-outline)] text-md-on-surface-variant hover:border-md-primary/50 hover:text-md-primary md-focus-ring"
                title="添加标签"
                onClick={() => setTagPickerOpen((o) => !o)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {tagPickerOpen ? (
                <div
                  className="absolute left-0 top-full z-20 mt-1 max-h-40 min-w-[8rem] overflow-y-auto border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] py-1 md-corner-md shadow-lg"
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
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(task.mentions ?? []).map((m) => (
            <span
              key={m}
              className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-[var(--md-sys-color-secondary-container)]/35 px-2 py-0.5 md-type-label-m text-md-on-surface"
            >
              <span className="min-w-0 truncate">@{m}</span>
              <button
                type="button"
                className="shrink-0 rounded-full p-0.5 text-md-on-surface-variant hover:bg-black/10 md-focus-ring"
                title="移除此人"
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
              onBlur={() => commitMention()}
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
          ) : (
            <button
              type="button"
              className="inline-flex h-6 items-center rounded-full border border-dashed border-[var(--md-sys-color-outline)] px-2 md-type-label-m text-md-on-surface-variant hover:border-md-primary/50 hover:text-md-primary md-focus-ring"
              title="添加 @提及"
              onClick={() => {
                setMentionOpen(true);
                setMentionDraft("");
              }}
            >
              + @
            </button>
          )}
        </div>
        {task.abandonedAt ? (
          <div className="mt-2 md-corner-sm border border-amber-800/50 bg-amber-950/25 px-2 py-1.5 md-type-body-s">
            <span className="text-md-on-surface-variant">放弃原因</span>
            <p className="mt-1 whitespace-pre-wrap text-amber-100/90">
              {task.abandonReason?.trim() ? task.abandonReason : "（未填写）"}
            </p>
          </div>
        ) : null}
        {task.completedAt ? (
          <div className="mt-2 md-corner-sm border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-high)] px-2 py-1.5 md-type-body-s">
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-md-on-surface-variant">
                完成结论
              </span>
              {!resultEditing ? (
                <button
                  type="button"
                  className="md-corner-sm p-1 text-md-on-surface-variant md-state-hover-subtle hover:text-md-primary md-focus-ring"
                  title="编辑结论"
                  onClick={() => {
                    setResultEditing(true);
                    setResultDraft(task.result ?? "");
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {resultEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="md-field md-focus-ring w-full px-2 py-1.5 md-type-body-m"
                  rows={3}
                  value={resultDraft}
                  onChange={(e) => setResultDraft(e.target.value)}
                  placeholder="记录实验结论、指标、复盘…"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="md-btn-filled md-focus-ring px-3 py-1 md-type-body-s"
                    onClick={() => {
                      const v = resultDraft.trim();
                      useAppStore.getState().updateTask(task.id, {
                        result: v || undefined,
                      });
                      setResultEditing(false);
                    }}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="md-btn-outlined md-focus-ring px-3 py-1 md-type-body-s"
                    onClick={() => setResultEditing(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-md-on-surface">
                {task.result?.trim() ? task.result : "（未填写）"}
              </p>
            )}
          </div>
        ) : null}
        {(task.completedAt || task.abandonedAt) &&
        task.folderId !== RECENT_DELETED_FOLDER_KEY ? (
          <div className="mt-2 md-type-body-s">
            <label className="text-md-on-surface-variant">
              添加后续关联（与下一任务连线，同文件夹内）
            </label>
            <select
              className="md-field md-focus-ring mt-1 w-full max-w-md px-2 py-1.5 md-type-body-s"
              defaultValue=""
              onChange={(e) => {
                const tid = e.target.value;
                e.target.value = "";
                if (!tid) return;
                useAppStore.getState().addEdge(task.id, tid);
              }}
            >
              <option value="">选择已有任务…</option>
              {allTasks
                .filter((t) => {
                  if (t.id === task.id) return false;
                  if (t.folderId === RECENT_DELETED_FOLDER_KEY) return false;
                  if (taskFolderKey(t) !== taskFolderKey(task)) return false;
                  if (edges.some((e) => e.source === task.id && e.target === t.id))
                    return false;
                  return true;
                })
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        {!task.completedAt && !task.abandonedAt && task.result ? (
          <p className="mt-2 md-corner-sm bg-[var(--md-sys-color-surface-container-high)] px-2 py-1.5 md-type-body-s">
            <span className="text-md-on-surface-variant">结果：</span>
            {task.result}
          </p>
        ) : null}
      </div>
      <div className="list-row-hover-actions flex shrink-0 flex-col gap-0.5 self-start sm:flex-row">
        <button
          type="button"
          className="md-corner-sm p-2 text-md-on-surface-variant md-state-hover-subtle hover:text-md-primary md-focus-ring"
          title="编辑标题"
          onClick={() => {
            skipNextTitleBlurSave.current = false;
            onStartEditTitle(task.id, task.title);
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {!task.completedAt &&
        !task.abandonedAt &&
        task.folderId !== RECENT_DELETED_FOLDER_KEY ? (
          <button
            type="button"
            className="md-corner-sm p-2 text-amber-500/90 md-state-hover-subtle hover:text-amber-400 md-focus-ring"
            title="放弃任务"
            onClick={() => onRequestAbandon(task)}
          >
            <Ban className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          className="md-corner-sm p-2 text-md-on-surface-variant md-state-hover-subtle hover:text-red-400 md-focus-ring"
          title={
            task.folderId === RECENT_DELETED_FOLDER_KEY
              ? "永久删除"
              : "删除"
          }
          onClick={() => useAppStore.getState().deleteTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Root>
  );
}

export const ListTaskRow = memo(ListTaskRowInner, listTaskRowPropsEqual);
