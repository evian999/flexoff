"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";
import {
  RECENT_DELETED_FOLDER_KEY,
  TODAY_NAV_KEY,
  type Task,
  type TaskPriority,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { AbandonTaskDialog } from "@/components/AbandonTaskDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { ListSidebar } from "@/components/ListSidebar";
import { ListNavContextLine } from "@/components/list/ListNavContextLine";
import { ListTaskDetailPanel } from "@/components/list/ListTaskDetailPanel";
import { ListTaskDetailEmpty } from "@/components/list/ListTaskDetailEmpty";
import { ListTaskRow } from "@/components/list/ListTaskRow";
import { TagHashTextInput } from "@/components/TagHashTextInput";
import { TaskPriorityMenu } from "@/components/TaskPriorityMenu";
import {
  listUnknownHashTagNamesInDraft,
  parseTaskDraft,
} from "@/lib/tag-draft";
import { findNextTaskFromEdges } from "@/lib/list-task-next";
import {
  bucketIncompleteTasksByDue,
  sortBucketTasksNewFirst,
  undatedIncompleteTasks,
} from "@/lib/list-due-buckets";
import { filterTasksForNav } from "@/lib/list-nav-filter";
import { useListUiPrefs } from "@/hooks/useListUiPrefs";
import { useScrollbarAutoHide } from "@/hooks/useScrollbarAutoHide";
import { useAnnounce } from "@/components/a11y/LiveRegionProvider";

const bucketHeadingClass =
  "mb-2 border-b border-[var(--md-sys-color-outline)]/50 pb-1 md-type-label-m font-semibold text-md-on-surface-variant";

export function ListMode() {
  const tasks = useAppStore((s) => s.tasks);
  const edges = useAppStore((s) => s.edges);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const navFolderId = useAppStore((s) => s.navFolderId);
  const navTagId = useAppStore((s) => s.navTagId);
  const navMention = useAppStore((s) => s.navMention);
  const inTrashNav = navFolderId === RECENT_DELETED_FOLDER_KEY;
  const addTask = useAppStore((s) => s.addTask);
  const addTag = useAppStore((s) => s.addTag);
  const announce = useAnnounce();
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<
    TaskPriority | undefined
  >(undefined);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [flashTaskId, setFlashTaskId] = useState<string | null>(null);
  const taskCardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const listScrollRef = useRef<HTMLDivElement>(null);
  const flashClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const { prefs: listUi, patch: patchListUi } = useListUiPrefs();
  const listFocusTaskId = useAppStore((s) => s.listFocusTaskId);
  const clearListFocusTaskId = useAppStore((s) => s.clearListFocusTaskId);
  useScrollbarAutoHide(listScrollRef);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

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
      setSelectedTaskId(target.id);
      const needOpenCompleted =
        Boolean(target.completedAt || target.abandonedAt) && !completedOpen;
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

  const newFirst = (a: Task, b: Task) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const filtered = useMemo(() => {
    let list = filterTasksForNav(tasks, navFolderId);
    if (navTagId) {
      list = list.filter((t) => t.tagIds?.includes(navTagId));
    }
    if (navMention) {
      list = list.filter((t) =>
        t.mentions?.some((m) => m.toLowerCase() === navMention),
      );
    }
    return list;
  }, [tasks, navFolderId, navTagId, navMention]);

  const incompleteTasks = useMemo(
    () =>
      filtered.filter((t) => !t.completedAt && !t.abandonedAt).sort(newFirst),
    [filtered],
  );

  const completedTasks = useMemo(
    () =>
      filtered
        .filter((t) => Boolean(t.completedAt || t.abandonedAt))
        .sort(newFirst),
    [filtered],
  );

  const nextFromEdges = useCallback(
    (task: Task) =>
      findNextTaskFromEdges(task, edges, incompleteTasks, completedTasks),
    [edges, incompleteTasks, completedTasks],
  );

  const incompleteBuckets = useMemo(() => {
    const raw = bucketIncompleteTasksByDue(incompleteTasks);
    return raw.map((b) => ({
      ...b,
      tasks: sortBucketTasksNewFirst(b.tasks),
    }));
  }, [incompleteTasks]);

  const undatedTasks = useMemo(
    () => sortBucketTasksNewFirst(undatedIncompleteTasks(incompleteTasks)),
    [incompleteTasks],
  );

  const submit = () => {
    if (inTrashNav) return;
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
      ...(navFolderId === TODAY_NAV_KEY ? { dueAt: new Date().toISOString() } : {}),
      ...(draftPriority !== undefined ? { priority: draftPriority } : {}),
    });
    setDraft("");
  };

  const registerCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) taskCardRefs.current.set(id, el);
    else taskCardRefs.current.delete(id);
  }, []);

  const onSaveTitleFromBlur = useCallback((taskId: string, draft: string) => {
    const st = useAppStore.getState();
    for (const name of listUnknownHashTagNamesInDraft(draft, st.tags)) {
      st.addTag(name);
    }
    const { title, tagIds: fromHash } = parseTaskDraft(draft, st.tags);
    const nextTitle = title.trim() ? title : "未命名任务";
    const task = st.tasks.find((t) => t.id === taskId);
    if (!task) {
      setEditingTaskId(null);
      return;
    }
    const mergedIds = [...new Set([...(task.tagIds ?? []), ...fromHash])];
    st.updateTask(taskId, {
      title: nextTitle,
      tagIds: mergedIds.length > 0 ? mergedIds : undefined,
    });
    setEditingTaskId(null);
  }, []);

  const onStartEditTitle = useCallback((taskId: string, title: string) => {
    setEditingTaskId(taskId);
    setTaskTitleDraft(title);
  }, []);

  const onCancelTitleEdit = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  useEffect(() => {
    if (!listFocusTaskId) return;
    const task = tasks.find((t) => t.id === listFocusTaskId);
    if (!task) {
      clearListFocusTaskId();
      return;
    }
    jumpToTask(task);
    clearListFocusTaskId();
  }, [listFocusTaskId, tasks, jumpToTask, clearListFocusTaskId]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const renderTaskRow = (
    task: Task,
    serial: number,
    link: ReturnType<typeof findNextTaskFromEdges>,
    listElement: "li" | "div" = "li",
  ) => (
    <ListTaskRow
      key={task.id}
      listElement={listElement}
      density="compact"
      selected={selectedTaskId === task.id}
      onSelect={selectTask}
      task={task}
      serial={serial}
      nextInList={link?.next}
      nextSerial={link?.serial}
      isFlashing={flashTaskId === task.id}
      tags={tags}
      folders={folders}
      allTasks={tasks}
      edges={edges}
      isEditingTitle={editingTaskId === task.id}
      titleDraft={editingTaskId === task.id ? taskTitleDraft : ""}
      onTitleDraftChange={setTaskTitleDraft}
      onStartEditTitle={onStartEditTitle}
      onCancelTitleEdit={onCancelTitleEdit}
      onSaveTitleFromBlur={onSaveTitleFromBlur}
      editingTaskId={editingTaskId}
      onRequestCompleteDialog={setCompleteTarget}
      onRequestAbandon={setAbandonTarget}
      jumpToTask={jumpToTask}
      registerCardRef={registerCardRef}
    />
  );

  return (
    <div className="flex min-h-0 h-full flex-1">
      {listUi.sidebarCollapsed ? (
        <div className="flex h-full w-11 shrink-0 flex-col items-center border-r border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/80 py-2 backdrop-blur-sm">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={listScrollRef}
            className="scrollbar-auto-hide scrollbar-gutter-stable relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-6"
          >
            <div className="sticky top-0 z-20 -mx-4 mb-3 w-[calc(100%+2rem)] space-y-3 border-b border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)]/90 px-4 py-3 backdrop-blur-md">
              {inTrashNav ? (
                <p className="md-type-body-s text-md-on-surface-variant">
                  最近删除视图中无法新建任务。可使用每条任务旁的「恢复」还原到删除前的文件夹，或使用「永久删除」清空该项。
                </p>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <ListNavContextLine
                    navFolderId={navFolderId}
                    folders={folders}
                    navTagId={navTagId}
                    navMention={navMention}
                    tags={tags}
                    sidebarCollapsed={listUi.sidebarCollapsed}
                  />
                </div>
              </div>
              <hr className="m-0 border-0 border-t border-[var(--md-sys-color-outline)]/60" />
              <div
                className={`flex w-full flex-col gap-2 sm:flex-row sm:items-stretch ${
                  inTrashNav ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <div className="flex w-full min-w-0 flex-1 items-stretch gap-2">
                  <div className="flex min-w-0 flex-1 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] md-corner-md focus-within:border-md-primary focus-within:ring-2 focus-within:ring-md-primary/25">
                    <TaskPriorityMenu
                      value={draftPriority}
                      onChange={setDraftPriority}
                    />
                    <TagHashTextInput
                      className="md-focus-ring min-w-0 flex-1 border-0 bg-transparent px-3 py-3 md-type-body-m text-md-on-surface outline-none placeholder:text-md-on-surface-variant"
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
                当前筛选下暂无任务。可调整左侧文件夹或标签，或新建任务。
              </p>
            ) : (
              <div className="flex w-full min-w-0 flex-col gap-6">
                {incompleteTasks.length > 0 ? (
                  <div className="flex w-full flex-col gap-4">
                    {incompleteBuckets.map((bucket, bi) =>
                      bucket.tasks.length === 0 ? null : (
                        <section key={bucket.key} className="flex w-full flex-col">
                          {bucket.label ? (
                            <h3 className={bucketHeadingClass}>
                              {bucket.label}
                            </h3>
                          ) : null}
                          <ul className="flex w-full flex-col gap-2">
                            {bucket.tasks.map((task, i) => {
                              const link = nextFromEdges(task);
                              const offset = incompleteBuckets
                                .slice(0, bi)
                                .reduce((s, b) => s + b.tasks.length, 0);
                              const serial = offset + i + 1;
                              return renderTaskRow(task, serial, link, "li");
                            })}
                          </ul>
                        </section>
                      ),
                    )}
                    {undatedTasks.length > 0 ? (
                      <ul className="flex w-full flex-col gap-2">
                        {undatedTasks.map((task, i) => {
                          const link = nextFromEdges(task);
                          const offset = incompleteBuckets.reduce(
                            (s, b) => s + b.tasks.length,
                            0,
                          );
                          const serial = offset + i + 1;
                          return renderTaskRow(task, serial, link, "li");
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {completedTasks.length > 0 ? (
                  <div className="flex w-full flex-col gap-2">
                    <button
                      type="button"
                      id="list-completed-toggle"
                      aria-expanded={completedOpen}
                      aria-controls="list-completed-tasks"
                      onClick={() => setCompletedOpen((o) => !o)}
                      className="flex w-full items-center gap-2 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] px-3 py-2 text-left md-type-body-m font-medium text-md-on-surface md-corner-md hover:border-md-primary/40 md-focus-ring"
                      style={{
                        boxShadow: "var(--md-sys-elevation-shadow-1)",
                      }}
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
                      <ul
                        id="list-completed-tasks"
                        className="flex w-full flex-col gap-2"
                      >
                        {completedTasks.map((task, i) => {
                          const link = nextFromEdges(task);
                          return renderTaskRow(
                            task,
                            i + 1,
                            link,
                            "li",
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            <CompleteTaskDialog
              task={completeTarget}
              onClose={() => setCompleteTarget(null)}
              onCompleted={(t) => announce(`已完成：${t.title}`)}
            />
            <AbandonTaskDialog
              task={abandonTarget}
              onClose={() => setAbandonTarget(null)}
              onAbandoned={(t) => announce(`已放弃：${t.title}`)}
            />
          </div>
        </div>
        {selectedTask ? (
          listUi.detailPanelCollapsed ? (
            <div className="flex h-full w-11 shrink-0 flex-col items-center border-l border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/80 py-2 backdrop-blur-sm">
              <button
                type="button"
                title="展开详情"
                aria-label="展开详情"
                className="md-btn-tonal md-focus-ring p-2"
                onClick={() => patchListUi({ detailPanelCollapsed: false })}
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <ListTaskDetailPanel
              task={selectedTask}
              tags={tags}
              folders={folders}
              edges={edges}
              incompleteTasks={incompleteTasks}
              completedTasks={completedTasks}
              isEditingTitle={editingTaskId === selectedTask.id}
              titleDraft={editingTaskId === selectedTask.id ? taskTitleDraft : ""}
              onTitleDraftChange={setTaskTitleDraft}
              onStartEditTitle={onStartEditTitle}
              onCancelTitleEdit={onCancelTitleEdit}
              onSaveTitleFromBlur={onSaveTitleFromBlur}
              onRequestCompleteDialog={setCompleteTarget}
              onRequestAbandon={setAbandonTarget}
              jumpToTask={jumpToTask}
              onClose={() => setSelectedTaskId(null)}
              onCollapse={() => patchListUi({ detailPanelCollapsed: true })}
            />
          )
        ) : (
          <ListTaskDetailEmpty />
        )}
      </div>
    </div>
  );
}
