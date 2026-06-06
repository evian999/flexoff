"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { DevProfiler } from "@/components/dev/DevProfiler";
import { LiveRegionProvider, useAnnounce } from "@/components/a11y/LiveRegionProvider";
import { AppIconRail } from "@/components/AppIconRail";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { ListMode } from "@/components/ListMode";
import { useAppStore } from "@/lib/store";

const CanvasView = dynamic(() => import("@/components/CanvasView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-md-on-surface-variant">
      画布加载中…
    </div>
  ),
});

function ModeAnnounceBridge() {
  const mode = useAppStore((s) => s.mode);
  const announce = useAnnounce();
  const prev = useRef(mode);
  useEffect(() => {
    if (prev.current === mode) return;
    prev.current = mode;
    announce(
      mode === "list" ? "已切换到列表模式" : "已切换到画布模式",
    );
  }, [mode, announce]);
  return null;
}

export function AppClient() {
  const hydrated = useAppStore((s) => s.hydrated);
  const loadError = useAppStore((s) => s.loadError);
  const saveError = useAppStore((s) => s.saveError);
  const clearSaveError = useAppStore((s) => s.clearSaveError);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  useEffect(() => {
    void useAppStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useAppStore.getState().setListSearchOpen(true);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "l" || e.key === "L") setMode("list");
      if (e.key === "c" || e.key === "C") setMode("canvas");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMode]);

  if (!hydrated) {
    return (
      <LiveRegionProvider>
        <div className="flex flex-1 items-center justify-center text-sm text-md-on-surface-variant">
          载入数据…
        </div>
      </LiveRegionProvider>
    );
  }

  if (loadError) {
    return (
      <LiveRegionProvider>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm text-red-400">无法加载数据：{loadError}</p>
          <p className="md-type-body-s">请确认已运行 next dev 且 /api/data 可访问。</p>
        </div>
      </LiveRegionProvider>
    );
  }

  return (
    <LiveRegionProvider>
      <ModeAnnounceBridge />
      <GlobalSearchDialog />
      <div className="flex min-h-0 h-full flex-1">
        <AppIconRail />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {saveError ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-xs text-red-300">
              <span>保存失败：{saveError}</span>
              <button
                type="button"
                className="rounded-sm px-1 py-0.5 text-xs text-md-on-surface-variant underline md-focus-ring md-state-hover"
                onClick={clearSaveError}
              >
                关闭
              </button>
            </div>
          ) : null}

          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none"
          >
            <div
              key={mode}
              className="app-main-view flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              {mode === "list" ? (
                <DevProfiler id="ListMode">
                  <ListMode />
                </DevProfiler>
              ) : (
                <DevProfiler id="CanvasView">
                  <CanvasView />
                </DevProfiler>
              )}
            </div>
          </main>
        </div>
      </div>
    </LiveRegionProvider>
  );
}
