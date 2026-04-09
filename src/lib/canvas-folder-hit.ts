import type { Rect } from "./types";
import { INBOX_FOLDER_KEY } from "./types";

/**
 * 流坐标下点 (px, py) 落在哪个文件夹竖条内；多个重叠时取面积最小（更内层）。
 * 若不在任何竖条内，视为「栏外」→ 归收件箱虚拟栏。
 */
export function folderKeyContainingFlowPoint(
  px: number,
  py: number,
  folderRects: Record<string, Rect>,
): string {
  const hits: { key: string; area: number }[] = [];
  for (const [key, r] of Object.entries(folderRects)) {
    if (
      px >= r.x &&
      px <= r.x + r.w &&
      py >= r.y &&
      py <= r.y + r.h
    ) {
      hits.push({ key, area: r.w * r.h });
    }
  }
  if (hits.length === 0) return INBOX_FOLDER_KEY;
  hits.sort((a, b) => a.area - b.area);
  return hits[0]!.key;
}
