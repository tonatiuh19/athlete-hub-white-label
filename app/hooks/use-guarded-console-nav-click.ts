import { useCallback, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEventConsoleNavigationGuard } from "@/components/staff/event-console/EventConsoleNavigationGuardContext";
import type { DiscardIntent } from "@/hooks/use-unsaved-changes-guard";

function isEditTabSwitch(from: string, to: string): boolean {
  const fromPath = from.split("?")[0] ?? from;
  const toPath = to.split("?")[0] ?? to;
  return fromPath === toPath && fromPath.includes("/edit");
}

/** Intercepts in-app link clicks when the event console has unsaved edits. */
export function useGuardedConsoleNavClick() {
  const { isDirty, requestNavigation } = useEventConsoleNavigationGuard();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string, onAfterNavigate?: () => void) =>
      (event: MouseEvent<HTMLAnchorElement>) => {
        const current = `${location.pathname}${location.search}${location.hash}`;
        if (current === to) {
          onAfterNavigate?.();
          return;
        }
        if (!isDirty) {
          onAfterNavigate?.();
          return;
        }
        event.preventDefault();
        const intent: DiscardIntent = isEditTabSwitch(current, to)
          ? "switchTab"
          : "leave";
        requestNavigation(() => {
          navigate(to);
          onAfterNavigate?.();
        }, intent);
      },
    [isDirty, location.hash, location.pathname, location.search, navigate, requestNavigation],
  );
}
