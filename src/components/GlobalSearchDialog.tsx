"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, Search, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  searchTasksGlobal,
  splitHighlight,
  taskFolderDisplayName,
} from "@/lib/task-search";
import { listCheckboxStyle } from "@/lib/task-priority-ui";

/** 全局任务搜索悬浮框（对标滴答清单居中搜索面板） */
export function GlobalSearchDialog() {
  const open = useAppStore((s) => s.listSearchOpen);
  const query = useAppStore((s) => s.listSearchQuery);
  const setQuery = useAppStore((s) => s.setListSearchQuery);
  const setOpen = useAppStore((s) => s.setListSearchOpen);
  const focusTaskFromSearch = useAppStore((s) => s.focusTaskFromSearch);
  const tasks = useAppStore((s) => s.tasks);
  const tags = useAppStore((s) => s.tags);
  const folders = useAppStore((s) => s.folders);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => searchTasksGlobal(tasks, tags, query),
    [tasks, tags, query],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open || typeof document === "undefined") return null;

  const close = () => setOpen(false);

  return createPortal(
    <div
      className="md-scrim fixed inset-0 z-[10050] flex items-start justify-center px-4 pt-[min(18vh,10rem)]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] shadow-2xl md-corner-xl"
        style={{ boxShadow: "var(--md-sys-elevation-shadow-dialog)" }}
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-[var(--md-sys-color-outline)]/70 px-3 py-2.5">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-md-on-surface-variant"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            className="w-full border-0 bg-transparent py-1.5 pl-9 pr-9 md-type-body-m text-md-on-surface outline-none placeholder:text-md-on-surface-variant"
            placeholder="搜索任务、备注、标签…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            aria-label="搜索关键词"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-md-on-surface-variant md-state-hover-subtle md-focus-ring"
            title="关闭"
            aria-label="关闭搜索"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(24rem,50vh)] overflow-y-auto px-1 py-2">
          {query.trim() ? (
            <>
              <p className="px-3 py-1.5 md-type-label-m text-md-on-surface-variant">
                任务
              </p>
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center md-type-body-s text-md-on-surface-variant">
                  未找到匹配「{query.trim()}」的任务
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {results.map((task) => {
                    const hl = splitHighlight(task.title, query);
                    const done = Boolean(task.completedAt || task.abandonedAt);
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-3 py-2.5 text-left md-state-hover md-focus-ring"
                          onClick={() => focusTaskFromSearch(task.id)}
                        >
                          <span
                            className="inline-flex h-4 w-4 shrink-0 rounded border-2"
                            style={listCheckboxStyle(
                              Boolean(task.completedAt),
                              task.priority,
                              Boolean(task.abandonedAt),
                            )}
                            aria-hidden
                          />
                          <span
                            className={`min-w-0 truncate md-type-body-m ${
                              done
                                ? "text-md-on-surface-variant line-through"
                                : "text-md-on-surface"
                            }`}
                          >
                            {hl ? (
                              <>
                                {hl.before}
                                <mark className="rounded-sm bg-amber-400/45 px-0.5 text-inherit">
                                  {hl.match}
                                </mark>
                                {hl.after}
                              </>
                            ) : (
                              task.title
                            )}
                          </span>
                          <span className="flex max-w-[7rem] shrink-0 items-center gap-1 truncate md-type-body-s text-md-on-surface-variant">
                            <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            <span className="truncate">
                              {taskFolderDisplayName(task, folders)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="px-3 py-10 text-center md-type-body-s text-md-on-surface-variant">
              输入关键词搜索全部任务
            </p>
          )}
        </div>

        {query.trim() ? (
          <p className="border-t border-[var(--md-sys-color-outline)]/60 px-4 py-2.5 text-center text-[0.75rem] text-md-on-surface-variant/80">
            点击任务可跳转到对应列表并打开详情
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
