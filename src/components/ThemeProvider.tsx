"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "taskpath-theme";
const STORAGE_KEY_LEGACY = "algo-theme";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored !== "light" && stored !== "dark") {
        stored = localStorage.getItem(STORAGE_KEY_LEGACY) as Theme | null;
        if (stored === "light" || stored === "dark") {
          localStorage.setItem(STORAGE_KEY, stored);
          localStorage.removeItem(STORAGE_KEY_LEGACY);
        }
      }
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        applyTheme(stored);
      } else {
        applyTheme("dark");
      }
    } catch {
      applyTheme("dark");
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
