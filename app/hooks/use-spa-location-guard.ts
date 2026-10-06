import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DiscardIntent } from "@/hooks/use-unsaved-changes-guard";

function locationKey(pathname: string, search: string, hash: string) {
  return `${pathname}${search}${hash}`;
}

function isEditTabSwitch(from: string, to: string): boolean {
  const fromPath = from.split("?")[0] ?? from;
  const toPath = to.split("?")[0] ?? to;
  return fromPath === toPath && fromPath.includes("/edit");
}

/**
 * Reverts unexpected SPA navigations (browser back/forward, manual URL edits) when dirty.
 * Allowed navigations must set `allowNavigationRef.current = true` first (via `requestNavigation`).
 */
export function useSpaLocationGuard(
  isDirty: boolean,
  requestNavigation: (action: () => void, intent?: DiscardIntent) => void,
  allowNavigationRef: React.MutableRefObject<boolean>,
) {
  const location = useLocation();
  const navigate = useNavigate();
  const stableLocationRef = useRef(
    locationKey(location.pathname, location.search, location.hash),
  );
  const reentryGuardRef = useRef(false);

  useEffect(() => {
    const current = locationKey(location.pathname, location.search, location.hash);

    if (allowNavigationRef.current) {
      allowNavigationRef.current = false;
      stableLocationRef.current = current;
      reentryGuardRef.current = false;
      return;
    }

    if (!isDirty) {
      stableLocationRef.current = current;
      reentryGuardRef.current = false;
      return;
    }

    if (current === stableLocationRef.current) {
      reentryGuardRef.current = false;
      return;
    }

    if (reentryGuardRef.current) return;
    reentryGuardRef.current = true;

    const revertTo = stableLocationRef.current;
    const intended = current;
    const intent: DiscardIntent = isEditTabSwitch(revertTo, intended)
      ? "switchTab"
      : "leave";

    navigate(revertTo, { replace: true });

    requestNavigation(() => {
      reentryGuardRef.current = false;
      navigate(intended);
    }, intent);
  }, [
    allowNavigationRef,
    isDirty,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    requestNavigation,
  ]);
}
