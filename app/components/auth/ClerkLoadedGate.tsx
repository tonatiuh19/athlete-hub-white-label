import type { ReactNode } from "react";
import { ClerkFailed, ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import { isClerkEnabled } from "@/lib/api";

interface ClerkLoadedGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only after Clerk JS loaded; optional fallback while loading / on failure. */
export default function ClerkLoadedGate({
  children,
  fallback = null,
}: ClerkLoadedGateProps) {
  if (!isClerkEnabled) return <>{children}</>;
  return (
    <>
      <ClerkLoading>{fallback}</ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
      <ClerkFailed>{fallback}</ClerkFailed>
    </>
  );
}
