import type { Node } from "@xyflow/react";
import { readFlowNodeSize } from "@/lib/folder-fit";

/** 与画布 TaskNode 估算占位一致（max-w 280 + padding） */
const TASK_W = 288;
const TASK_H = 140;
const GAP = 8;
const MAX_ITER = 160;

function buildById(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function absolutePos(
  n: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  if (!n.parentId) return { x: n.position.x, y: n.position.y };
  const p = byId.get(n.parentId);
  if (!p) return { x: n.position.x, y: n.position.y };
  const po = absolutePos(p, byId);
  return { x: n.position.x + po.x, y: n.position.y + po.y };
}

function setFromAbsolute(
  n: Node,
  abs: { x: number; y: number },
  byId: Map<string, Node>,
) {
  if (!n.parentId) {
    n.position = { x: abs.x, y: abs.y };
    return;
  }
  const p = byId.get(n.parentId);
  if (!p) {
    n.position = { x: abs.x, y: abs.y };
    return;
  }
  const po = absolutePos(p, byId);
  n.position = { x: abs.x - po.x, y: abs.y - po.y };
}

type TRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function overlaps(a: TRect, b: TRect): boolean {
  return !(
    a.x + a.w + GAP <= b.x ||
    b.x + b.w + GAP <= a.x ||
    a.y + a.h + GAP <= b.y ||
    b.y + b.h + GAP <= a.y
  );
}

function taskRect(n: Node, byId: Map<string, Node>): TRect {
  const p = absolutePos(n, byId);
  const sz = readFlowNodeSize(n);
  return {
    id: n.id,
    x: p.x,
    y: p.y,
    w: sz?.w ?? TASK_W,
    h: sz?.h ?? TASK_H,
  };
}

/** 浅拷贝节点与 position，供就地调整 */
export function cloneNodesShallow(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    position: { ...n.position },
  }));
}

/** 仅比较绝对坐标，避免因首次测量宽高变化误触发持久化 */
export function taskNodesAbsolutePositionKey(nodes: Node[]): string {
  const byId = buildById(nodes);
  const tasks = nodes
    .filter((n) => n.type === "task")
    .sort((a, b) => a.id.localeCompare(b.id));
  return tasks
    .map((t) => {
      const p = absolutePos(t, byId);
      return `${t.id}:${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join("|");
}

/**
 * 画布上所有任务卡片按**绝对坐标**互斥：任意两任务重叠时，将 id 字典序靠后者推开（迭代至稳定）。
 * 跨文件夹、跨任务组同样生效。
 */
export function separateOverlappingTaskNodes(nodes: Node[]): Node[] {
  const next = cloneNodesShallow(nodes);
  const byId = buildById(next);
  const tasks = next
    .filter((n) => n.type === "task")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (tasks.length < 2) return next;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false;
    const rects: TRect[] = tasks.map((t) => taskRect(t, byId));
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const A = rects[i];
        const B = rects[j];
        if (!overlaps(A, B)) continue;
        const nodeJ = tasks[j];
        const bAbs = { x: B.x, y: B.y };
        const overlapX =
          Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const overlapY =
          Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        const newAbs =
          overlapX < overlapY
            ? { x: A.x + A.w + GAP, y: bAbs.y }
            : { x: bAbs.x, y: A.y + A.h + GAP };
        setFromAbsolute(nodeJ, newAbs, byId);
        moved = true;
        rects[j] = {
          id: B.id,
          x: newAbs.x,
          y: newAbs.y,
          w: B.w,
          h: B.h,
        };
      }
    }
    if (!moved) break;
  }

  return next;
}
