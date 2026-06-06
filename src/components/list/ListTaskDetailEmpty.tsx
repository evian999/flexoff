"use client";

import { ClipboardList } from "lucide-react";

/** 右侧详情栏无选中任务时的空状态（Ant Design Empty 风格） */
export function ListTaskDetailEmpty() {
  return (
    <aside
      className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-l border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)]"
      aria-label="任务详情"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container-high)]"
          aria-hidden
        >
          <ClipboardList className="h-10 w-10 text-md-on-surface-variant/60" />
        </div>
        <p className="md-type-body-m text-md-on-surface-variant">
          暂无选中的任务
        </p>
        <p className="mt-1 max-w-[16rem] text-[0.8125rem] leading-relaxed text-md-on-surface-variant/80">
          在左侧列表中点击任务，可在此查看与编辑详情
        </p>
      </div>
    </aside>
  );
}
