"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import { ARCHIVE_FOLDER_KEY, INBOX_FOLDER_KEY } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { ListSidebar } from "@/components/ListSidebar";
import { TagBadge } from "@/components/TagBadge";
import { TagHashTextInput } from "@/components/TagHashTextInput";
import { TaskPriorityMenu } from "@/components/TaskPriorityMenu";
import {
  listUnknownHashTagNamesInDraft,
  parseTaskDraft,
} from "@/lib/tag-draft";
import { listCheckboxStyle } from "@/lib/task-priority-ui";
import { useListUiPrefs } from "@/hooks/useListUiPrefs";

const NEXT_TASK_PREVIEW_MAX = 10;

/** 下一任务按钮展示：最多约 10 个字（按 Unicode 字素），超出加省略号 */
function nextTaskPreviewLabel(title: string): string {
  const raw = title.trim() || "未命名";
  const g = Array.from(raw);
  if (g.length <= NEXT_TASK_PREVIEW_MAX) return g.join("");
  return g.slice(0, NEXT_TASK_PREVIEW_MAX).join("") + "…";
}

export function ListMode() {
  const tasks = useAppStore((s) => s.tasks);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const navFolderId = useAppStore((s) => s.navFolderId);
  const navTagId = useAppStore((s) => s.navTagId);
  const listSearchQuery = useAppStore((s) => s.listSearchQuery);
  const addTask = useAppStore((s) => s.addTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const uncompleteTask = useAppStore((s) => s.uncompleteTask);
  const setTaskFolder = useAppStore((s) => s.setTaskFolder);
  const toggleTaskTag = useAppStore((s) => s.toggleTaskTag);
  const addTag = useAppStore((s) => s.addTag);
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<
    TaskPriority | undefined
  >(undefined);
  const [tagPickerTaskId, setTagPickerTaskId] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [flashTaskId, setFlashTaskId] = useState<string | null>(null);
  const skipNextTitleBlurSave = useRef(false);
  const taskCardRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const flashClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const { prefs: listUi, patch: patchListUi } = useListUiPrefs();

  const triggerTaskFlash = useCallback((taskId: string) => {
    if (flashClearTimeoutRef.current) {
      clearTimeout(flashClearTimeoutRef.current);
    }
    setFlashTaskId(taskId);
    flashClearTimeoutRef.current = setTimeout(() => {
      setFlashTaskId(null);
      flashClearTimeoutRef.current = null;
    }, 1400);
  }, []);

  const jumpToTask = useCallback(
    (target: Task) => {
      const needOpenCompleted =
        Boolean(target.completedAt) && !completedOpen;
      if (needOpenCompleted) {
        setCompletedOpen(true);
      }
      window.setTimeout(
        () => {
          const el = taskCardRefs.current.get(target.id);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          triggerTaskFlash(target.id);
        },
        needOpenCompleted ? 200 : 0,
      );
    },
    [completedOpen, triggerTaskFlash],
  );

  /** 列表序号与「下一任务」均按创建时间从早到晚 */
  const oldFirst = (a: Task, b: Task) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (navFolderId === "all") {
      /* no folder filter */
    } else if (navFolderId === INBOX_FOLDER_KEY) {
      list = list.filter((t) => !t.folderId);
    } else if (navFolderId === ARCHIVE_FOLDER_KEY) {
      list = list.filter((t) => t.folderId === ARCHIVE_FOLDER_KEY);
    } else {
      list = list.filter((t) => t.folderId === navFolderId);
    }
    if (navTagId) {
      list = list.filter((t) => t.tagIds?.includes(navTagId));
    }
    const q = listSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        if (t.title.toLowerCase().includes(q)) return true;
        if (t.result?.toLowerCase().includes(q)) return true;
        for (const tid of t.tagIds ?? []) {
          const name = tags.find((x) => x.id === tid)?.name;
          if (name?.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }
    return list;
  }, [tasks, navFolderId, navTagId, listSearchQuery, tags]);

  const incompleteTasks = useMemo(
    () => filtered.filter((t) => !t.completedAt).sort(oldFirst),
    [filtered],
  );

  const completedTasks = useMemo(
    () => filtered.filter((t) => Boolean(t.completedAt)).sort(oldFirst),
    [filtered],
  );

  const submit = () => {
    for (const name of listUnknownHashTagNamesInDraft(
      draft,
      useAppStore.getState().tags,
    )) {
      addTag(name);
    }
    const { title, tagIds } = parseTaskDraft(
      draft,
      useAppStore.getState().tags,
    );
    if (!title && tagIds.length === 0) return;
    addTask(title || "未命名任务", undefined, {
      tagIds: tagIds.length ? tagIds : undefined,
      ...(draftPriority !== undefined ? { priority: draftPriority } : {}),
    });
    setDraft("");
  };

  const taskRow = (
    task: Task,
    serial: number,
    nextInList?: Task,
    nextSerial?: number,
  ) => (
    <li
      key={task.id}
      id={`list-task-${task.id}`}
      ref={(el) => {
        if (el) taskCardRefs.current.set(task.id, el);
        else taskCardRefs.current.delete(task.id);
      }}
      className={`flex flex-col gap-2 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] p-4 md-corner-md sm:flex-row sm:items-start ${
        flashTaskId === task.id ? "list-task-target-flash" : ""
      }`}
      style={{ boxShadow: "var(--md-sys-elevation-shadow-1)" }}
    >
      <span
        className="mt-0.5 w-7 shrink-0 text-right tabular-nums md-type-body-s text-md-on-surface-variant sm:mt-1"
        title="按创建时间排序的序号"
      >
        {serial}.
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-2 appearance-none transition-colors"
        style={listCheckboxStyle(Boolean(task.completedAt), task.priority)}
        title={
          task.priority === undefined
            ? "未完成（无优先级）"
            : "未完成时边框颜色表示优先级（红/黄/蓝=高/中/低）"
        }
        checked={Boolean(task.completedAt)}
        onChange={(e) => {
          if (e.target.checked) setCompleteTarget(task);
          else uncompleteTask(task.id);
        }}
      />
      <div className="min-w-0 flex-1">
        {editingTaskId === task.id ? (
          <div className="relative w-full min-w-0">
            <TagHashTextInput
              className="md-field md-focus-ring w-full px-2 py-1.5 md-type-body-m"
              placeholder="标题…（用 # 选择标签，回车结束编辑）"
              value={taskTitleDraft}
              onChange={setTaskTitleDraft}
              tags={tags}
              suggestAbove
              autoFocus
              onInputBlur={() => {
                if (skipNextTitleBlurSave.current) {
                  skipNextTitleBlurSave.current = false;
                  return;
                }
                if (editingTaskId !== task.id) return;
                const { title, tagIds: fromHash } = parseTaskDraft(
                  taskTitleDraft,
                  tags,
                );
                const nextTitle = title.trim() ? title : "未命名任务";
                const mergedIds = [
                  ...new Set([...(task.tagIds ?? []), ...fromHash]),
                ];
                updateTask(task.id, {
                  title: nextTitle,
                  tagIds: mergedIds.length > 0 ? mergedIds : undefined,
                });
                setEditingTaskId(null);
              }}
              onInputKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  skipNextTitleBlurSave.current = true;
                  setEditingTaskId(null);
                }
              }}
            />
          </div>
        ) : (
          <p
            className={`md-type-body-m font-medium ${
              task.completedAt
                ? "text-md-on-surface-variant line-through"
                : "text-md-on-surface"
            }`}
          >
            {task.title}
          </p>
        )}
        <p className="mt-0.5 md-type-body-s">
          {new Date(task.createdAt).toLocaleString()}
        </p>
        <div className="mt-2 flex min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-0">
          <label className="flex min-w-0 max-w-full shrink-0 items-center gap-1 md-type-label-m">
            文件夹
            <select
              className="md-field md-focus-ring px-2 py-1 md-type-body-s text-md-on-surface md-corner-sm"
              value={task.folderId ?? ""}
              onChange={(e) =>
                setTaskFolder(
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
                onRemove={() => toggleTaskTag(task.id, tg!.id)}
              />
            ))}
          {tags.some((t) => !task.tagIds?.includes(t.id)) ? (
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--md-sys-color-outline)] text-md-on-surface-variant hover:border-md-primary/50 hover:text-md-primary md-focus-ring"
                title="添加标签"
                onClick={() =>
                  setTagPickerTaskId((id) =>
                    id === task.id ? null : task.id,
                  )
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {tagPickerTaskId === task.id ? (
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
                          toggleTaskTag(task.id, t.id);
                          setTagPickerTaskId(null);
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
        {task.result ? (
          <p className="mt-2 md-corner-sm bg-[var(--md-sys-color-surface-container-high)] px-2 py-1.5 md-type-body-s">
            <span className="text-md-on-surface-variant">结果：</span>
            {task.result}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 self-start sm:flex-row">
        <button
          type="button"
          className="md-corner-sm p-2 text-md-on-surface-variant md-state-hover-subtle hover:text-md-primary md-focus-ring"
          title="编辑标题"
          onClick={() => {
            skipNextTitleBlurSave.current = false;
            setEditingTaskId(task.id);
            setTaskTitleDraft(task.title);
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="md-corner-sm p-2 text-md-on-surface-variant md-state-hover-subtle hover:text-red-400 md-focus-ring"
          title="删除"
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );

  const mainMaxClass =
    "max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl";

  return (
    <div className="flex min-h-0 flex-1">
      {listUi.sidebarCollapsed ? (
        <div className="flex w-11 shrink-0 flex-col items-center border-r border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/80 py-2 backdrop-blur-sm">
          <button
            type="button"
            title="展开侧栏"
            aria-label="展开侧栏"
            className="md-btn-tonal md-focus-ring p-2"
            onClick={() => patchListUi({ sidebarCollapsed: false })}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <ListSidebar
          onRequestCollapse={() => patchListUi({ sidebarCollapsed: true })}
        />
      )}
      <div
        className={`mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto px-4 pb-6 ${mainMaxClass}`}
      >
        <div className="sticky top-0 z-20 -mx-4 mb-3 space-y-3 border-b border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)]/90 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-stretch gap-2">
              {/*
              勿对整块使用 overflow-hidden，否则会裁切优先级下拉与 # 标签建议列表
            */}
              <div className="flex min-w-0 flex-1 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] md-corner-md focus-within:border-md-primary focus-within:ring-2 focus-within:ring-md-primary/25">
                <TaskPriorityMenu
                  value={draftPriority}
                  onChange={setDraftPriority}
                />
                <TagHashTextInput
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 md-type-body-m text-md-on-surface outline-none placeholder:text-md-on-surface-variant"
                  placeholder="请输入任务…（用 # 选择标签，回车或点右侧添加）"
                  value={draft}
                  onChange={setDraft}
                  tags={tags}
                  onInputKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
              </div>
              <button
                type="button"
                className="md-btn-filled md-focus-ring shrink-0 px-5 py-3 md-type-body-m"
                onClick={submit}
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-md-on-surface-variant">
            {listSearchQuery.trim()
              ? "没有匹配当前搜索的任务，可换个关键词或清空搜索框。"
              : "当前筛选下暂无任务。可调整左侧文件夹或标签，或新建任务。"}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {incompleteTasks.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {incompleteTasks.map((task, i) =>
                  taskRow(
                    task,
                    i + 1,
                    incompleteTasks[i + 1],
                    incompleteTasks[i + 1] ? i + 2 : undefined,
                  ),
                )}
              </ul>
            ) : null}
            {completedTasks.length > 0 ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCompletedOpen((o) => !o)}
                  className="flex w-full items-center gap-2 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] px-3 py-2 text-left md-type-body-m font-medium text-md-on-surface md-corner-md hover:border-md-primary/40 md-focus-ring"
                  style={{ boxShadow: "var(--md-sys-elevation-shadow-1)" }}
                >
                  {completedOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-md-on-surface-variant" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-md-on-surface-variant" />
                  )}
                  <span>已完成</span>
                  <span className="md-type-body-s font-normal text-md-on-surface-variant">
                    （{completedTasks.length}）
                  </span>
                </button>
                {completedOpen ? (
                  <ul className="flex flex-col gap-2">
                    {completedTasks.map((task, i) =>
                      taskRow(
                        task,
                        i + 1,
                        completedTasks[i + 1],
                        completedTasks[i + 1] ? i + 2 : undefined,
                      ),
                    )}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <CompleteTaskDialog
          task={completeTarget}
          onClose={() => setCompleteTarget(null)}
        />
      </div>
    </div>
  );
}
