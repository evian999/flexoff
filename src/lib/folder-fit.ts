import type { Node } from "@xyflow/react";
import type { LayoutState, Rect, Task, TaskGroup } from "./types";
import { defaultInboxRect, taskFolderKey } from "./types";

/** 两个文件夹外框是否已分开（含间隙） */
function folderRectsSeparated(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

/** 仅平移后序文件夹 rb，使其与 ra 不重叠；选位移代价最小的一种 */
function separationDeltaBFromA(
  ra: Rect,
  rb: Rect,
  gap: number,
): { dx: number; dy: number } {
  if (folderRectsSeparated(ra, rb, gap)) return { dx: 0, dy: 0 };

  const candidates: { dx: number; dy: number }[] = [
    { dx: ra.x + ra.w + gap - rb.x, dy: 0 },
    { dx: ra.x - gap - rb.x - rb.w, dy: 0 },
    { dx: 0, dy: ra.y + ra.h + gap - rb.y },
    { dx: 0, dy: ra.y - gap - rb.y - rb.h },
  ];

  let best: { dx: number; dy: number } | null = null;
  let bestCost = Infinity;
  for (const c of candidates) {
    const nb = { ...rb, x: rb.x + c.dx, y: rb.y + c.dy };
    if (!folderRectsSeparated(ra, nb, gap)) continue;
    const cost = Math.abs(c.dx) + Math.abs(c.dy);
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best ?? { dx: gap, dy: 0 };
}

/**
 * 画布「全部文件夹」视图：消除文件夹 lane 之间的重叠（含间隙）。
 * 按固定顺序（收件箱 → 各文件夹 → 归档）只推动后序文件夹及其内部任务的绝对坐标。
 */
export function packFolderLanesNoOverlapForAllView(
  folderOrder: string[],
  folderRects: Record<string, Rect>,
  tasks: Task[],
  groups: TaskGroup[],
  positions: LayoutState["positions"],
  groupRects: LayoutState["groupRects"],
  gap = 40,
): {
  folderRects: Record<string, Rect>;
  positions: LayoutState["positions"];
  groupRects: LayoutState["groupRects"];
} {
  const nextFr = Object.fromEntries(
    Object.entries(folderRects).map(([k, v]) => [k, { ...v }]),
  ) as Record<string, Rect>;
  const nextPos = { ...positions };
  const nextGr = Object.fromEntries(
    Object.entries(groupRects).map(([k, v]) => [k, { ...v }]),
  ) as LayoutState["groupRects"];

  const shiftFolder = (folderKey: string, dx: number, dy: number) => {
    if (dx === 0 && dy === 0) return;
    const r = nextFr[folderKey];
    if (!r) return;
    nextFr[folderKey] = { ...r, x: r.x + dx, y: r.y + dy };
    for (const t of tasks) {
      if (taskFolderKey(t) !== folderKey) continue;
      const p = nextPos[t.id];
      if (p) nextPos[t.id] = { x: p.x + dx, y: p.y + dy };
    }
    for (const g of groups) {
      const fid = g.taskIds[0];
      if (!fid) continue;
      const task = tasks.find((x) => x.id === fid);
      if (!task || taskFolderKey(task) !== folderKey) continue;
      const gr = nextGr[g.id];
      if (gr) nextGr[g.id] = { ...gr, x: gr.x + dx, y: gr.y + dy };
    }
  };

  const keys = folderOrder.filter((k) => nextFr[k]);
  if (keys.length < 2) {
    return { folderRects: nextFr, positions: nextPos, groupRects: nextGr };
  }

  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let b = 1; b < keys.length; b++) {
      const kb = keys[b]!;
      for (let a = 0; a < b; a++) {
        const ka = keys[a]!;
        const ra = nextFr[ka]!;
        const rb = nextFr[kb]!;
        const { dx, dy } = separationDeltaBFromA(ra, rb, gap);
        if (dx !== 0 || dy !== 0) {
          shiftFolder(kb, dx, dy);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return { folderRects: nextFr, positions: nextPos, groupRects: nextGr };
}

/** 与 TaskNode max-w 280px + 边距对齐的估算包裹宽 */
export const TASK_NODE_BOUNDS_W = 300;
/** 含标题、标签、结果等时的保守高度 */
export const TASK_NODE_BOUNDS_H = 200;

const GROUP_CONTENT_PAD = 24;

/**
 * 根据成员任务的绝对坐标估算任务组外框（与 mergeFolderRects 使用同一套节点占位）。
 * 仅统计 `canvasVisibleTaskIds` 中的成员；无有效坐标时返回 null。
 */
export function computeGroupRectFromTaskPositions(
  taskIds: string[],
  positions: LayoutState["positions"],
  canvasVisibleTaskIds: Set<string>,
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let has = false;
  for (const tid of taskIds) {
    if (!canvasVisibleTaskIds.has(tid)) continue;
    const p = positions[tid];
    if (!p) continue;
    has = true;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + TASK_NODE_BOUNDS_W);
    maxY = Math.max(maxY, p.y + TASK_NODE_BOUNDS_H);
  }
  if (!has) return null;
  const pad = GROUP_CONTENT_PAD;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}
/** 文件夹外沿相对内部任务/组包盒的留白（用户约 20px） */
const FOLDER_OUTER_PAD = 20;

function parseCssNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace("px", ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** 从 React Flow 节点读取当前宽高（拖拽/缩放后） */
export function readFlowNodeSize(n: Node): { w: number; h: number } | null {
  const mw = n.measured?.width;
  const mh = n.measured?.height;
  if (
    typeof mw === "number" &&
    typeof mh === "number" &&
    mw > 0 &&
    mh > 0
  ) {
    return { w: mw, h: mh };
  }
  const w =
    (typeof n.width === "number" && n.width > 0 ? n.width : undefined) ??
    parseCssNumber(n.style?.width);
  const h =
    (typeof n.height === "number" && n.height > 0 ? n.height : undefined) ??
    parseCssNumber(n.style?.height);
  if (w !== undefined && h !== undefined && w > 0 && h > 0) {
    return { w, h };
  }
  return null;
}

function expandFolderRectToContent(
  fk: string,
  rect: Rect,
  tasks: Task[],
  groups: TaskGroup[],
  positions: LayoutState["positions"],
  groupRects: LayoutState["groupRects"],
  canvasVisibleTaskIds: Set<string>,
): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let has = false;

  const pad = FOLDER_OUTER_PAD;

  for (const t of tasks) {
    if (taskFolderKey(t) !== fk) continue;
    if (!canvasVisibleTaskIds.has(t.id)) continue;
    const p = positions[t.id];
    if (!p) continue;
    has = true;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + TASK_NODE_BOUNDS_W);
    maxY = Math.max(maxY, p.y + TASK_NODE_BOUNDS_H);
  }

  for (const g of groups) {
    const touchesFolderVisible = g.taskIds.some((id) => {
      const t = tasks.find((x) => x.id === id);
      return Boolean(
        t && taskFolderKey(t) === fk && canvasVisibleTaskIds.has(id),
      );
    });
    if (!touchesFolderVisible) continue;
    const r = groupRects[g.id];
    if (!r) continue;
    has = true;
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }

  /** 与画布 NodeResizer 最小尺寸对齐；空文件夹允许小于 defaultInboxRect */
  const EMPTY_MIN_W = 160;
  const EMPTY_MIN_H = 160;

  const def = defaultInboxRect();
  const baseX = Number.isFinite(rect.x) ? rect.x : def.x;
  const baseY = Number.isFinite(rect.y) ? rect.y : def.y;
  const baseW = Number.isFinite(rect.w) && rect.w > 0 ? rect.w : def.w;
  const baseH = Number.isFinite(rect.h) && rect.h > 0 ? rect.h : def.h;

  if (!has) {
    return {
      x: baseX,
      y: baseY,
      w: Math.max(baseW, EMPTY_MIN_W),
      h: Math.max(baseH, EMPTY_MIN_H),
    };
  }

  const contentL = minX - pad;
  const contentT = minY - pad;
  const contentR = maxX + pad;
  const contentB = maxY + pad;

  /** 与用户拖拽/缩放后的栏取并集：只扩大不缩小，避免切换「全部文件夹」时丢尺寸 */
  const userL = baseX;
  const userT = baseY;
  const userR = baseX + baseW;
  const userB = baseY + baseH;
  const unionL = Math.min(userL, contentL);
  const unionT = Math.min(userT, contentT);
  const unionR = Math.max(userR, contentR);
  const unionB = Math.max(userB, contentB);

  return {
    x: unionL,
    y: unionT,
    w: Math.max(unionR - unionL, EMPTY_MIN_W),
    h: Math.max(unionB - unionT, EMPTY_MIN_H),
  };
}

/** 在保留用户拖拽/缩放尺寸的前提下，与各文件夹内可见内容取并集（必要时扩大，不缩小） */
export function mergeFolderRectsWithTaskBounds(
  folderRects: Record<string, Rect>,
  tasks: Task[],
  groups: TaskGroup[],
  positions: LayoutState["positions"],
  groupRects: LayoutState["groupRects"],
  canvasVisibleTaskIds: Set<string>,
): Record<string, Rect> {
  const next = { ...folderRects };
  for (const fk of Object.keys(next)) {
    next[fk] = expandFolderRectToContent(
      fk,
      next[fk],
      tasks,
      groups,
      positions,
      groupRects,
      canvasVisibleTaskIds,
    );
  }
  return next;
}
