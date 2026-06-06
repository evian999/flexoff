"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  announce: (message: string) => void;
};

const LiveRegionContext = createContext<Ctx | null>(null);

export function useAnnounce() {
  const v = useContext(LiveRegionContext);
  return v?.announce ?? (() => {});
}

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    const t = message.trim();
    if (!t) return;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setMsg("");
    window.requestAnimationFrame(() => {
      setMsg(t);
      clearTimer.current = setTimeout(() => setMsg(""), 3500);
    });
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-px w-px overflow-hidden p-0 opacity-0"
      >
        {msg}
      </div>
      <div
        id="flex-off-dnd-live"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-px w-px overflow-hidden p-0 opacity-0"
      />
    </LiveRegionContext.Provider>
  );
}
