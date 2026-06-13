"use client";

import Link from "next/link";
import { LayoutGrid, List, LogOut, Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppStore } from "@/lib/store";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** 最左窄轨：模式 / 主题 / 设置 / 退出（对标滴答左侧图标列 + 品牌渐变条） */
export function AppIconRail() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const listSearchOpen = useAppStore((s) => s.listSearchOpen);
  const setListSearchOpen = useAppStore((s) => s.setListSearchOpen);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const avatarRef = useRef<HTMLButtonElement>(null);

  const updateMenuPos = useCallback(() => {
    const el = avatarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.top - 8, left: r.left });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [menuOpen, updateMenuPos]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { username?: string }) => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        avatarRef.current?.contains(e.target as Node) ||
        (e.target as Element)?.closest("[data-avatar-menu]")
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const initial = username ? username.charAt(0).toUpperCase() : "";

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
      <div className="relative">
        <button
          ref={avatarRef}
          type="button"
          title={username || "用户菜单"}
          aria-label={username ? `当前用户 ${username}` : "用户菜单"}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="md-focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] md-type-body-m font-semibold hover:opacity-90 transition-opacity"
        >
          {initial}
        </button>
      </div>
      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              data-avatar-menu
              className="fixed z-[10001] w-44 border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] py-1 md-corner-md shadow-xl"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                transform: "translateY(-100%)",
              }}
            >
              <div className="px-3 py-2 md-type-body-s text-md-on-surface-variant border-b border-[var(--md-sys-color-outline)]/40">
                {username}
              </div>
              <button
                type="button"
                disabled={logoutLoading}
                className="flex w-full items-center gap-2 px-3 py-2 md-type-body-s text-red-400 hover:bg-red-500/10 md-focus-ring"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>,
            document.body,
          )
        : null}
    </aside>
  );
}
