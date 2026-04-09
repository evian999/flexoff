"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export function SettingsTopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/90 px-4 backdrop-blur-md">
      <div>
        <span className="md-type-body-m font-semibold text-md-on-surface">Taskpath</span>
        <span className="ml-2 md-type-body-s">设置</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
