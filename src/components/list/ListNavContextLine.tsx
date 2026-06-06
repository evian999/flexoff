"use client";

import { useMemo } from "react";
import { navFolderDisplayName, isSmartListNav } from "@/lib/list-nav-filter";
import type { NavFolderId } from "@/lib/types";
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
  const folderLabel = useMemo(
    () => navFolderDisplayName(navFolderId, folders),
    [navFolderId, folders],
  );

  const tagLabel = useMemo(() => {
    if (!navTagId) return null;
    return tags.find((t) => t.id === navTagId)?.name ?? navTagId;
  }, [navTagId, tags]);

  const show =
    sidebarCollapsed ||
    isSmartListNav(navFolderId) ||
    navFolderId !== "all" ||
    Boolean(navTagId) ||
    Boolean(navMention?.trim());

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
