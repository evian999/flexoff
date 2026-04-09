"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? "切换深色" : "切换浅色"}
      className={`md-btn-outlined md-focus-ring flex items-center justify-center p-2 text-md-on-surface-variant hover:border-md-primary/45 hover:text-md-primary ${className}`}
      aria-label={isLight ? "切换深色模式" : "切换浅色模式"}
    >
      {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
    </button>
  );
}
