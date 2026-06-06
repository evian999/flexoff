import type { Folder, Tag, Task } from "@/lib/types";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  RECENT_DELETED_FOLDER_KEY,
} from "@/lib/types";
import { notesHtmlToPlainText } from "@/lib/task-notes-format";

export function taskFolderDisplayName(
  task: Task,
  folders: Folder[],
): string {
  if (task.folderId === RECENT_DELETED_FOLDER_KEY) return "最近删除";
  if (task.folderId === ARCHIVE_FOLDER_KEY) return "归档";
  if (!task.folderId) return "收件箱";
  return folders.find((f) => f.id === task.folderId)?.name ?? "文件夹";
}

export function searchTasksGlobal(
  tasks: Task[],
  tags: Tag[],
  query: string,
  limit = 40,
): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return tasks
    .filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      const plainResult = notesHtmlToPlainText(t.result ?? "")
        .trim()
        .toLowerCase();
      if (plainResult.includes(q)) return true;
      for (const tid of t.tagIds ?? []) {
        const name = tags.find((x) => x.id === tid)?.name;
        if (name?.toLowerCase().includes(q)) return true;
      }
      for (const m of t.mentions ?? []) {
        if (m.toLowerCase().includes(q)) return true;
      }
      return false;
    })
    .slice(0, limit);
}

export function splitHighlight(
  text: string,
  query: string,
): { before: string; match: string; after: string } | null {
  const q = query.trim();
  if (!q) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return null;
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length),
  };
}
