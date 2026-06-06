import { useEffect, type RefObject } from "react";

const SCROLLBAR_VISIBLE_MS = 650;

/** 仅在滚动时显示滚动条，停止滚动后延迟淡出隐藏 */
export function useScrollbarAutoHide<T extends HTMLElement>(
  ref: RefObject<T | null>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      el.classList.add("is-scrolling");
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        el.classList.remove("is-scrolling");
      }, SCROLLBAR_VISIBLE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timeout) clearTimeout(timeout);
      el.classList.remove("is-scrolling");
    };
  }, [ref]);
}
