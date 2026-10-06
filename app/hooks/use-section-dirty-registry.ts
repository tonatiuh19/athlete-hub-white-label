import { useCallback, useMemo, useState } from "react";

/** Aggregates per-section dirty flags from the event editor. */
export function useSectionDirtyRegistry() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const setSectionDirty = useCallback((key: string, dirty: boolean) => {
    setFlags((prev) => {
      const wasDirty = Boolean(prev[key]);
      if (dirty) {
        if (wasDirty) return prev;
        return { ...prev, [key]: true };
      }
      if (!wasDirty) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllSectionDirty = useCallback(() => {
    setFlags((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const anySectionDirty = useMemo(
    () => Object.values(flags).some(Boolean),
    [flags],
  );

  return { setSectionDirty, clearAllSectionDirty, anySectionDirty, flags };
}
