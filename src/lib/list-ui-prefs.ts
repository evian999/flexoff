const STORAGE_KEY = "taskpath-list-ui";

export type ListUiPrefs = {
  sidebarCollapsed: boolean;
};

export const defaultListUiPrefs: ListUiPrefs = {
  sidebarCollapsed: false,
};

export function readListUiPrefs(): ListUiPrefs {
  if (typeof window === "undefined") return { ...defaultListUiPrefs };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultListUiPrefs };
    const p = JSON.parse(raw) as Partial<ListUiPrefs> & {
      wideLayout?: boolean;
      compact?: boolean;
    };
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
  } catch {
    /* ignore */
  }
}
