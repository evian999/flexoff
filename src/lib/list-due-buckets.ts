import type { Task } from "@/lib/types";

export type DueBucket = {
  key: string;
  label: string;
  tasks: Task[];
};

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
  const s = startOfLocalDay(d);
  return new Date(s.getTime() + 86400000 - 1);
}

export function parseDue(task: Task): Date | null {
  if (!task.dueAt?.trim()) return null;
  const t = new Date(task.dueAt);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * 未完成列表按截止日期分段（对标滴答：逾期 / 今天 / 七日内 / 更远 / 无截止）。
 * 仅用于列表主列展示顺序；不改变 store 内任务顺序。
 */
export function bucketIncompleteTasksByDue(tasks: Task[]): DueBucket[] {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000 - 1);

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];

  for (const t of tasks) {
    const due = parseDue(t);
    if (!due) {
      continue;
    }
    if (due < todayStart) {
      overdue.push(t);
      continue;
    }
    if (due <= todayEnd) {
      today.push(t);
      continue;
    }
    if (due <= weekEnd) {
      thisWeek.push(t);
      continue;
    }
    later.push(t);
  }

  const out: DueBucket[] = [];
  if (overdue.length)
    out.push({ key: "overdue", label: "已逾期", tasks: overdue });
  if (today.length) out.push({ key: "today", label: "今天", tasks: today });
  if (thisWeek.length)
    out.push({ key: "thisWeek", label: "七天内", tasks: thisWeek });
  if (later.length) out.push({ key: "later", label: "更远", tasks: later });
  return out;
}

/** 无截止日期的未完成任务（不单独成段，列表末尾平铺展示） */
export function undatedIncompleteTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !parseDue(t));
}

/** 列表行尾部：截止 / 完成 / 放弃时间 */
export function formatListTaskTailDate(task: Task): string | null {
  const raw = task.completedAt ?? task.abandonedAt ?? task.dueAt;
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86400000 - 1);

  if (d >= todayStart && d <= todayEnd) return "今天";
  if (d > todayEnd && d <= tomorrowEnd) return "明天";
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 各桶内仍按「新在上」排序 */
export function sortBucketTasksNewFirst(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
