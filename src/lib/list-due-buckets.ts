import type { Task } from "@/lib/types";

export type DueBucket = {
  key: string;
  label: string;
  tasks: Task[];
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d: Date): Date {
  const s = startOfLocalDay(d);
  return new Date(s.getTime() + 86400000 - 1);
}

function parseDue(task: Task): Date | null {
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
  const noDue: Task[] = [];

  for (const t of tasks) {
    const due = parseDue(t);
    if (!due) {
      noDue.push(t);
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
  if (noDue.length)
    out.push({ key: "noDue", label: "无截止日期", tasks: noDue });
  return out;
}

/** 各桶内仍按「新在上」排序 */
export function sortBucketTasksNewFirst(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
