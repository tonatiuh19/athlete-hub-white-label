import { useCallback, useEffect, useRef, useState } from "react";

export type DiscardIntent = "leave" | "switchTab";

export type UnsavedChangesGuard = {
  dialogOpen: boolean;
  discardIntent: DiscardIntent;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
  /** Set true before programmatic navigation that should bypass the SPA location guard. */
  allowNavigationRef: React.MutableRefObject<boolean>;
  /** Run navigation only when clean; otherwise opens the discard dialog. */
  requestNavigation: (action: () => void, intent?: DiscardIntent) => void;
};

/**
 * Guards in-app navigation (via `requestNavigation`) and browser unload when `isDirty`.
 * Pair with `useSpaLocationGuard` and route-level interceptors (console sidebar, back links).
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent>("leave");
  const pendingActionRef = useRef<(() => void) | null>(null);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const runAllowedNavigation = useCallback((action: () => void) => {
    allowNavigationRef.current = true;
    action();
  }, []);

  const cancelDiscard = useCallback(() => {
    setDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  const confirmDiscard = useCallback(() => {
    setDialogOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) runAllowedNavigation(action);
  }, [runAllowedNavigation]);

  const requestNavigation = useCallback(
    (action: () => void, intent: DiscardIntent = "leave") => {
      if (!isDirty) {
        runAllowedNavigation(action);
        return;
      }
      setDiscardIntent(intent);
      pendingActionRef.current = action;
      setDialogOpen(true);
    },
    [isDirty, runAllowedNavigation],
  );

  return {
    dialogOpen,
    discardIntent,
    confirmDiscard,
    cancelDiscard,
    allowNavigationRef,
    requestNavigation,
  };
}
