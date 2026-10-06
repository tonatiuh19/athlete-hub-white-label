import { createContext, useContext, type ReactNode } from "react";
import type { AppLocale } from "@shared/i18n";

export interface StaffPortalContextValue {
  persistLanguage: (locale: AppLocale) => void;
}

const StaffPortalContext = createContext<StaffPortalContextValue | null>(null);

export function StaffPortalProvider({
  value,
  children,
}: {
  value: StaffPortalContextValue;
  children: ReactNode;
}) {
  return (
    <StaffPortalContext.Provider value={value}>{children}</StaffPortalContext.Provider>
  );
}

export function useStaffPortal() {
  const ctx = useContext(StaffPortalContext);
  if (!ctx) {
    throw new Error("useStaffPortal must be used within StaffPortalProvider");
  }
  return ctx;
}

/** Optional hook for components that may render outside staff layout (e.g. tests). */
export function useStaffPortalOptional() {
  return useContext(StaffPortalContext);
}
