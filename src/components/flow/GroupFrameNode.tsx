"use client";

import { type NodeProps } from "@xyflow/react";
import { useAppStore } from "@/lib/store";

export type GroupFrameData = { groupId: string; name: string };

export function GroupFrameNode({ data, selected }: NodeProps) {
  const d = data as GroupFrameData;
  const updateGroupName = useAppStore((s) => s.updateGroupName);
  const removeGroup = useAppStore((s) => s.removeGroup);

  return (
    <div className="pointer-events-none relative h-full w-full">
      <div
        className={`pointer-events-none absolute inset-0 md-corner-xl border border-dashed bg-[var(--group-bg)] backdrop-blur-[2px] ${
          selected ? "border-md-primary" : "border-[var(--md-sys-color-outline)]"
        }`}
      />
      <div className="group-frame-drag pointer-events-auto relative z-[1] flex cursor-grab items-center gap-2 border-b border-[var(--md-sys-color-outline)] px-2 py-1.5 active:cursor-grabbing">
        <input
          className="nodrag nopan min-w-0 flex-1 bg-transparent md-type-body-s font-medium text-md-on-surface outline-none placeholder:text-md-on-surface-variant md-focus-ring"
          value={d.name}
          onChange={(e) => updateGroupName(d.groupId, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className="nodrag nopan shrink-0 md-corner-sm px-1.5 py-0.5 text-[0.625rem] text-md-on-surface-variant md-state-hover-subtle hover:text-red-400 md-focus-ring"
          onClick={(e) => {
            e.stopPropagation();
            removeGroup(d.groupId);
          }}
        >
          解散
        </button>
      </div>
    </div>
  );
}
