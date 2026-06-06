"use client";

import { useMemo } from "react";
import {
  ARCHIVE_FOLDER_KEY,
  INBOX_FOLDER_KEY,
  RECENT_DELETED_FOLDER_KEY,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";

type Props = {
  incompleteCount: number;
  completedCount: number;
  edgeCount: number;
};

/** 宽屏右侧弱信息栏：筛选摘要、计数与快捷键（对标滴答右栏信息密度） */
export function ListRightPanel({
  incompleteCount,
  completedCount,
  edgeCount,
}: Props) {
  const navFolderId = useAppStore((s) => s.navFolderId);
  const navTagId = useAppStore((s) => s.navTagId);
  const navMention = useAppStore((s) => s.navMention);
  const listSearchQuery = useAppStore((s) => s.listSearchQuery);
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);

  const folderLine = useMemo(() => {
    if (navFolderId === "all") return "全部文件夹";
    if (navFolderId === INBOX_FOLDER_KEY) return "收件箱";
    if (navFolderId === ARCHIVE_FOLDER_KEY) return "归档";
    if (navFolderId === RECENT_DELETED_FOLDER_KEY) return "最近删除";
    return folders.find((f) => f.id === navFolderId)?.name ?? "文件夹";
  }, [navFolderId, folders]);

  const tagLine = useMemo(() => {
    if (!navTagId) return null;
    return tags.find((t) => t.id === navTagId)?.name ?? navTagId;
  }, [navTagId, tags]);

  return (
    <aside
      className="hidden w-[min(36%,320px)] min-w-[260px] shrink-0 flex-col border-l border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/75 px-3 py-4 backdrop-blur-sm xl:flex"
      aria-label="当前视图摘要"
    >
      <h2 className="md-type-label-m font-semibold text-md-on-surface">
        当前视图
      </h2>
      <dl className="mt-3 space-y-2 md-type-body-s text-md-on-surface-variant">
        <div>
          <dt className="text-[0.65rem] uppercase tracking-wide text-md-on-surface-variant/80">
            文件夹
          </dt>
          <dd className="mt-0.5 text-md-on-surface">{folderLine}</dd>
        </div>
        {tagLine ? (
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-md-on-surface-variant/80">
              标签
            </dt>
            <dd className="mt-0.5 text-md-on-surface">#{tagLine}</dd>
          </div>
        ) : null}
        {navMention?.trim() ? (
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-md-on-surface-variant/80">
              提及
            </dt>
            <dd className="mt-0.5 text-md-on-surface">@{navMention}</dd>
          </div>
        ) : null}
        {listSearchQuery.trim() ? (
          <div>
            <dt className="text-[0.65rem] uppercase tracking-wide text-md-on-surface-variant/80">
              搜索
            </dt>
            <dd className="mt-0.5 truncate text-md-on-surface" title={listSearchQuery}>
              {listSearchQuery}
            </dd>
          </div>
        ) : null}
        <div className="border-t border-[var(--md-sys-color-outline)]/60 pt-2">
          <dt className="text-[0.65rem] uppercase tracking-wide text-md-on-surface-variant/80">
            计数
          </dt>
          <dd className="mt-1 space-y-1 text-md-on-surface">
            <p>未完成 {incompleteCount}</p>
            <p>已完成 {completedCount}</p>
            <p>连线 {edgeCount}</p>
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-[var(--md-sys-color-outline)]/60 pt-3 md-type-label-m text-md-on-surface-variant">
        <p className="font-medium text-md-on-surface">快捷键</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>L 列表</li>
          <li>C 画布</li>
        </ul>
      </div>
    </aside>
  );
}
