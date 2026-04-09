"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readListUiPrefs,
  writeListUiPrefs,
  defaultListUiPrefs,
  type ListUiPrefs,
} from "@/lib/list-ui-prefs";

export function useListUiPrefs() {
  const [prefs, setPrefsState] = useState<ListUiPrefs>(defaultListUiPrefs);

  useEffect(() => {
    setPrefsState(readListUiPrefs());
  }, []);

  const setPrefs = useCallback((next: ListUiPrefs) => {
    writeListUiPrefs(next);
    setPrefsState(next);
  }, []);

  const patch = useCallback((partial: Partial<ListUiPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...partial };
      writeListUiPrefs(next);
      return next;
    });
  }, []);

  return { prefs, patch, setPrefs };
}
