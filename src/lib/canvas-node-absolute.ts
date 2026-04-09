import type { Node } from "@xyflow/react";
import {
  readFlowNodeSize,
  TASK_NODE_BOUNDS_H,
  TASK_NODE_BOUNDS_W,
} from "@/lib/folder-fit";

/** 与 syncCanvasLayout 一致的节点绝对流坐标 */
export function absoluteFlowPosition(
  n: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  if (!n.parentId) return { x: n.position.x, y: n.position.y };
  const p = byId.get(n.parentId);
  if (!p) return { x: n.position.x, y: n.position.y };
  const po = absoluteFlowPosition(p, byId);
  return { x: n.position.x + po.x, y: n.position.y + po.y };
}

/** 任务卡片中心点（流坐标），用于文件夹命中测试 */
export function taskHitCenterFlow(
  n: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  const pos = absoluteFlowPosition(n, byId);
  const sz = readFlowNodeSize(n);
  const w = sz?.w ?? TASK_NODE_BOUNDS_W;
  const h = sz?.h ?? TASK_NODE_BOUNDS_H;
  return { x: pos.x + w / 2, y: pos.y + h / 2 };
}
