import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { resolveEventBySubdomain } from "@/store/slices/marketplaceSlice";
import { getCanonicalSiteOrigin } from "@/lib/siteMeta";
import { parseVanitySubdomain, isApexHost } from "@/utils/hostContext";
import OrganizerMicrositeHome from "@/pages/microsite/OrganizerMicrositeHome";
import OrganizerMicrositeLegalPage from "@/pages/microsite/OrganizerMicrositeLegalPage";
import { isOrganizerSiteLegalDocKey, type OrganizerSiteLegalKey } from "@/utils/organizerSiteLegal";
import api from "@/lib/api";

/**
 * On `{subdomain}.{apex}`:
 * - `/` → organizer microsite (published)
 * - `/legal/{terms|privacy|refund}` → organizer legal docs
 * - `/login`, `/portal` → stay (athlete realm)
 * - `/staff`, auth for organizers/admin → redirect to apex
 * - fallback: legacy event vanity → apex `/events/{slug}`
 */
export default function EventSubdomainHostRedirect() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<
    "idle" | "microsite" | "legal" | "resolving" | "failed"
  >("idle");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<OrganizerSiteLegalKey | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isApexHost()) return;

    const host = window.location.hostname;
    const sub = parseVanitySubdomain(host);
    if (!sub) return;

    const path = window.location.pathname || "/";
    if (path.startsWith("/api")) return;

    const apex = getCanonicalSiteOrigin();
    const search = window.location.search || "";
    const hash = window.location.hash || "";

    // Staff / organizer / admin auth always on apex
    if (
      path.startsWith("/staff") ||
      path.startsWith("/organizers") ||
      path.startsWith("/admin") ||
      path.startsWith("/sign-in") ||
      path.startsWith("/sign-up")
    ) {
      window.location.replace(`${apex}${path}${search}${hash}`);
      return;
    }

    // Athlete realm stays on vanity
    if (path.startsWith("/login") || path.startsWith("/portal")) {
      return;
    }

    // Event paths → apex canonical
    if (path.startsWith("/events/")) {
      window.location.replace(`${apex}${path}${search}${hash}`);
      return;
    }

    const legalMatch = path.match(/^\/legal\/([^/]+)\/?$/);
    const legalKey =
      legalMatch && isOrganizerSiteLegalDocKey(legalMatch[1])
        ? legalMatch[1]
        : null;

    let cancelled = false;
    setSubdomain(sub);
    setLegalDoc(legalKey);
    setMode("resolving");

    void (async () => {
      try {
        await api.get(`/sites/by-subdomain/${encodeURIComponent(sub)}`);
        if (cancelled) return;
        if (path === "/" || path === "") {
          setMode("microsite");
          return;
        }
        if (legalKey) {
          setMode("legal");
          return;
        }
        // Non-home path without microsite route → apex
        window.location.replace(`${apex}${path}${search}${hash}`);
      } catch {
        // Legacy: event vanity host
        const result = await dispatch(resolveEventBySubdomain(sub));
        if (cancelled) return;
        if (resolveEventBySubdomain.fulfilled.match(result)) {
          const target =
            result.payload.canonical_path || `/events/${result.payload.slug}`;
          window.location.replace(`${apex}${target}${search}${hash}`);
          return;
        }
        setMode("failed");
        window.setTimeout(() => {
          if (!cancelled) window.location.replace(`${apex}/`);
        }, 1800);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (mode === "microsite" && subdomain) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
        <OrganizerMicrositeHome subdomain={subdomain} />
      </div>
    );
  }

  if (mode === "legal" && subdomain && legalDoc) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
        <OrganizerMicrositeLegalPage
          subdomain={subdomain}
          documentKey={legalDoc}
        />
      </div>
    );
  }

  if (mode === "resolving" || mode === "failed") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center"
        role="status"
        aria-live="polite"
      >
        {mode === "resolving" ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("microsite.notFound")}
          </p>
        )}
      </div>
    );
  }

  return null;
}
