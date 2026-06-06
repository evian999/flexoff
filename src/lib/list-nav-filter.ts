import type { Folder, NavFolderId, Task } from "@/lib/types";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  NEXT_7_DAYS_NAV_KEY,
  RECENT_DELETED_FOLDER_KEY,
  TODAY_NAV_KEY,
} from "@/lib/types";
import {
  endOfLocalDay,
  parseDue,
  startOfLocalDay,
} from "@/lib/list-due-buckets";

export function isSmartListNav(navFolderId: NavFolderId): boolean {
  return navFolderId === TODAY_NAV_KEY || navFolderId === NEXT_7_DAYS_NAV_KEY;
}

export function filterTasksForNav(
  tasks: Task[],
  navFolderId: NavFolderId,
): Task[] {
  if (navFolderId === TODAY_NAV_KEY) {
    const todayEnd = endOfLocalDay(new Date());
    return tasks.filter((t) => {
      if (t.folderId === RECENT_DELETED_FOLDER_KEY) return false;
      const due = parseDue(t);
      if (!due) return false;
      return due <= todayEnd;
    });
  }

  if (navFolderId === NEXT_7_DAYS_NAV_KEY) {
    const todayStart = startOfLocalDay(new Date());
    const weekEnd = new Date(todayStart.getTime() + 7 * 86400000 - 1);
    return tasks.filter((t) => {
      if (t.folderId === RECENT_DELETED_FOLDER_KEY) return false;
      const due = parseDue(t);
      if (!due) return false;
      return due >= todayStart && due <= weekEnd;
    });
  }

  if (navFolderId === "all") {
    return tasks.filter((t) => t.folderId !== RECENT_DELETED_FOLDER_KEY);
  }
  if (navFolderId === INBOX_FOLDER_KEY) {
    return tasks.filter((t) => !t.folderId);
  }
  if (navFolderId === ARCHIVE_FOLDER_KEY) {
    return tasks.filter((t) => t.folderId === ARCHIVE_FOLDER_KEY);
  }
  if (navFolderId === RECENT_DELETED_FOLDER_KEY) {
    return tasks.filter((t) => t.folderId === RECENT_DELETED_FOLDER_KEY);
  }
  return tasks.filter((t) => t.folderId === navFolderId);
}

export function navFolderDisplayName(
  navFolderId: NavFolderId,
  folders: Pick<Folder, "id" | "name">[],
): string {
  if (navFolderId === "all") return "全部任务";
  if (navFolderId === TODAY_NAV_KEY) return "今天";
  if (navFolderId === NEXT_7_DAYS_NAV_KEY) return "最近7天";
  if (navFolderId === INBOX_FOLDER_KEY) return "收集箱";
  if (navFolderId === ARCHIVE_FOLDER_KEY) return "归档";
  if (navFolderId === RECENT_DELETED_FOLDER_KEY) return "最近删除";
  return folders.find((f) => f.id === navFolderId)?.name ?? "文件夹";
}

export function countIncompleteForNav(
  tasks: Task[],
  navFolderId: NavFolderId,
): number {
  const incomplete = tasks.filter(
    (t) =>
      !t.completedAt &&
      !t.abandonedAt &&
      t.folderId !== RECENT_DELETED_FOLDER_KEY,
  );
  return filterTasksForNav(incomplete, navFolderId).length;
}
