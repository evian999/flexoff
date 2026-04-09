"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import type { Task } from "@/lib/types";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  taskFolderKey,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { TagBadge } from "@/components/TagBadge";
import { priorityCheckboxBorder } from "@/lib/task-priority-ui";

export type TaskNodeData = { task: Task };

export function TaskNode({ data, selected }: NodeProps) {
  const { task } = data as TaskNodeData;
  const done = Boolean(task.completedAt);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const uncompleteTask = useAppStore((s) => s.uncompleteTask);
  const toggleTaskTag = useAppStore((s) => s.toggleTaskTag);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [completeOpen, setCompleteOpen] = useState(false);

  useEffect(() => {
    if (!editing) setTitleDraft(task.title);
  }, [task.title, editing]);

  const fk = taskFolderKey(task);
  const folderName =
    fk === INBOX_FOLDER_KEY
      ? "收件箱"
      : fk === ARCHIVE_FOLDER_KEY
        ? "归档"
        : folders.find((f) => f.id === fk)?.name ?? "文件夹";

  const taskTags = (task.tagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean);

  return (
    <>
      {completeOpen && typeof document !== "undefined"
        ? createPortal(
            <CompleteTaskDialog
              task={task}
              onClose={() => setCompleteOpen(false)}
            />,
            document.body,
          )
        : null}
    <div
      className={`task-node relative z-[1] min-w-[200px] max-w-[280px] border bg-[var(--md-sys-color-surface-container-low)] px-3 py-2 backdrop-blur-sm transition-colors md-corner-md ${
        selected
          ? "border-2 border-md-primary"
          : "border border-[var(--node-border)] hover:border-[var(--node-border-hover)]"
      }`}
      style={{ boxShadow: selected ? undefined : "var(--md-sys-elevation-shadow-1)" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!z-20 !h-2.5 !w-2.5 !border !border-md-primary !bg-md-surface"
      />
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={`nodrag nopan mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 transition-colors md-focus-ring ${
            done
              ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
              : ""
          }`}
          style={
            !done
              ? {
                  backgroundColor: "var(--checkbox-unchecked-fill)",
                  borderColor: priorityCheckboxBorder(task.priority),
                }
              : undefined
          }
          title={
            done
              ? "标记为未完成"
              : task.priority === undefined
                ? "未完成（无优先级）"
                : "未完成时边框颜色表示优先级；点击完成"
          }
          onClick={(e) => {
            e.stopPropagation();
            if (done) uncompleteTask(task.id);
            else setCompleteOpen(true);
          }}
        >
          {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[0.625rem] leading-3 text-md-on-surface-variant">
            {folderName}
          </p>
          {editing ? (
            <input
              className="nodrag nopan md-field md-focus-ring w-full px-1.5 py-1 md-type-body-m"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              autoFocus
              onBlur={() => {
                const t = titleDraft.trim();
                if (t) updateTask(task.id, { title: t });
                else setTitleDraft(task.title);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setTitleDraft(task.title);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <p
              className={`md-type-body-m font-medium leading-snug ${
                done
                  ? "text-md-on-surface-variant line-through"
                  : "text-md-on-surface"
              }`}
            >
              {task.title}
            </p>
          )}
          {taskTags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {taskTags.map((tg) => (
                <TagBadge
                  key={tg!.id}
                  tag={tg!}
                  tagIndex={tags.findIndex((x) => x.id === tg!.id)}
                  onRemove={() => toggleTaskTag(task.id, tg!.id)}
                />
              ))}
            </div>
          ) : null}
          {task.result ? (
            <p className="mt-1 line-clamp-2 md-type-body-s">{task.result}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            className="nodrag nopan md-corner-sm p-1 text-md-on-surface-variant md-state-hover-subtle hover:text-md-primary md-focus-ring"
            title="编辑标题"
            onClick={(e) => {
              e.stopPropagation();
              setTitleDraft(task.title);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="nodrag nopan md-corner-sm p-1 text-md-on-surface-variant md-state-hover-subtle hover:text-red-400 md-focus-ring"
            title="删除任务"
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!z-20 !h-2.5 !w-2.5 !border !border-md-primary !bg-md-surface"
      />
    </div>
    </>
  );
}
