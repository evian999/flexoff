"use client";

import { useMemo } from "react";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  RECENT_DELETED_FOLDER_KEY,
  type NavFolderId,
} from "@/lib/types";
import type { Folder, Tag } from "@/lib/types";

type Props = {
  navFolderId: NavFolderId;
  folders: Folder[];
  navTagId: string | null;
  navMention: string | null;
  tags: Tag[];
  /** 侧栏折叠时始终显示；展开时仅在存在标签/@ 筛选时显示 */
  sidebarCollapsed: boolean;
};

/** 列表主列顶部：当前文件夹 / 标签 / @ 提及 一句话上下文（补侧栏折叠后的导航失忆） */
export function ListNavContextLine({
  navFolderId,
  folders,
  navTagId,
  navMention,
  tags,
  sidebarCollapsed,
}: Props) {
  const folderLabel = useMemo(() => {
    if (navFolderId === "all") return "全部文件夹";
    if (navFolderId === INBOX_FOLDER_KEY) return "收件箱";
    if (navFolderId === ARCHIVE_FOLDER_KEY) return "归档";
    if (navFolderId === RECENT_DELETED_FOLDER_KEY) return "最近删除";
    return folders.find((f) => f.id === navFolderId)?.name ?? "文件夹";
  }, [navFolderId, folders]);

  const tagLabel = useMemo(() => {
    if (!navTagId) return null;
    return tags.find((t) => t.id === navTagId)?.name ?? navTagId;
  }, [navTagId, tags]);

  const show =
    sidebarCollapsed || Boolean(navTagId) || Boolean(navMention?.trim());

  if (!show) return null;

  const parts: string[] = [folderLabel];
  if (tagLabel) parts.push(`#${tagLabel}`);
  if (navMention?.trim()) parts.push(`@${navMention}`);

  return (
    <p
      className="md-type-label-m text-balance text-md-on-surface-variant"
      translate="no"
    >
      <span className="text-md-on-surface-variant">当前视图：</span>
      {parts.join(" · ")}
    </p>
  );
}
