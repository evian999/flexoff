import type { Task, TodoEdge } from "@/lib/types";

const NEXT_TASK_PREVIEW_MAX = 10;

/** 下一任务按钮展示：最多约 10 个字（按 Unicode 字素），超出加省略号 */
export function nextTaskPreviewLabel(title: string): string {
  const raw = title.trim() || "未命名";
  const g = Array.from(raw);
  if (g.length <= NEXT_TASK_PREVIEW_MAX) return g.join("");
  return g.slice(0, NEXT_TASK_PREVIEW_MAX).join("") + "…";
}

export function findNextTaskFromEdges(
  task: Task,
  edges: TodoEdge[],
  incompleteTasks: Task[],
  completedTasks: Task[],
): { next: Task; serial: number } | undefined {
  const outs = edges.filter((e) => e.source === task.id);
  for (const e of outs) {
    const incIdx = incompleteTasks.findIndex((t) => t.id === e.target);
    if (incIdx >= 0)
      return { next: incompleteTasks[incIdx]!, serial: incIdx + 1 };
    const compIdx = completedTasks.findIndex((t) => t.id === e.target);
    if (compIdx >= 0)
      return { next: completedTasks[compIdx]!, serial: compIdx + 1 };
  }
  return undefined;
}
