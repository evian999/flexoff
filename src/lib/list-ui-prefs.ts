const STORAGE_KEY = "flex-off-list-ui";
const STORAGE_KEY_LEGACY = "taskpath-list-ui";

export type ListDensity = "comfortable" | "compact";

export type ListUiPrefs = {
  sidebarCollapsed: boolean;
};

export const defaultListUiPrefs: ListUiPrefs = {
  sidebarCollapsed: false,
};

export function readListUiPrefs(): ListUiPrefs {
  if (typeof window === "undefined") return { ...defaultListUiPrefs };
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return { ...defaultListUiPrefs };
    const p = JSON.parse(raw) as Partial<ListUiPrefs>;
    return {
      sidebarCollapsed: Boolean(p.sidebarCollapsed),
    };
  } catch {
    return { ...defaultListUiPrefs };
  }
}

export function writeListUiPrefs(prefs: ListUiPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    localStorage.removeItem(STORAGE_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}
