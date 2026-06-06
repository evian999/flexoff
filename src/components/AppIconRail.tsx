"use client";

import Link from "next/link";
import { LayoutGrid, List, LogOut, Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppStore } from "@/lib/store";
import { useState } from "react";

/** 最左窄轨：模式 / 主题 / 设置 / 退出（对标滴答左侧图标列 + 品牌渐变条） */
export function AppIconRail() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const listSearchOpen = useAppStore((s) => s.listSearchOpen);
  const setListSearchOpen = useAppStore((s) => s.setListSearchOpen);
  const [logoutLoading, setLogoutLoading] = useState(false);

  async function logout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <aside
      className="app-icon-rail relative flex h-full min-h-0 w-[52px] shrink-0 flex-col items-center gap-1 border-r border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/90 py-2 backdrop-blur-md"
      aria-label="主导航"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--accent)]/55 via-[var(--accent)]/20 to-transparent"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setMode("list")}
        title="列表模式（快捷键 L）"
        aria-label="切换到列表模式"
        aria-current={mode === "list" ? "true" : undefined}
        className={`md-focus-ring relative z-[1] flex h-11 w-11 items-center justify-center rounded-[10px] md-type-body-s ${
          mode === "list"
            ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
            : "text-md-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <List className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setMode("canvas")}
        title="画布模式（快捷键 C）"
        aria-label="切换到画布模式"
        aria-current={mode === "canvas" ? "true" : undefined}
        className={`md-focus-ring relative z-[1] flex h-11 w-11 items-center justify-center rounded-[10px] md-type-body-s ${
          mode === "canvas"
            ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
            : "text-md-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <div className="my-1 h-px w-8 bg-[var(--md-sys-color-outline)]/50" aria-hidden />
      <ThemeToggle className="relative z-[1] !min-h-11 !min-w-11 !p-0" />
      <button
        type="button"
        title="搜索任务（Ctrl+K）"
        aria-label="搜索任务"
        aria-expanded={listSearchOpen}
        aria-haspopup="dialog"
        className={`md-focus-ring relative z-[1] flex h-11 w-11 items-center justify-center rounded-[10px] md-type-body-s ${
          listSearchOpen
            ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
            : "text-md-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
        }`}
        onClick={() => setListSearchOpen(true)}
      >
        <Search className="h-5 w-5" />
      </button>
      <Link
        href="/settings"
        title="设置与数据备份"
        aria-label="打开设置"
        className="md-focus-ring relative z-[1] flex h-11 w-11 items-center justify-center rounded-[10px] text-md-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Settings className="h-5 w-5" />
      </Link>
      <div className="flex-1" aria-hidden />
      <button
        type="button"
        disabled={logoutLoading}
        title="退出登录"
        aria-label="退出登录"
        onClick={() => void logout()}
        className="md-focus-ring relative z-[1] flex h-11 w-11 items-center justify-center rounded-[10px] text-md-on-surface-variant hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </aside>
  );
}
