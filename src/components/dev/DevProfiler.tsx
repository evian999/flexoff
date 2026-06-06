"use client";

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (process.env.NODE_ENV !== "development") return;
  if (actualDuration < 4 && phase !== "nested-update") return;
  console.debug(
    `[DevProfiler:${id}]`,
    phase,
    `actual=${actualDuration.toFixed(1)}ms`,
    `base=${baseDuration.toFixed(1)}ms`,
    { startTime, commitTime },
  );
};

type DevProfilerProps = {
  id: string;
  children: ReactNode;
};

/** 开发环境下包裹 React Profiler，便于用大量任务数据观察 ListMode / 画布提交耗时 */
export function DevProfiler({ id, children }: DevProfilerProps) {
  if (process.env.NODE_ENV !== "development") {
    return children;
  }
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
