import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, MonitorSmartphone } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import OrganizerMicrositePreview from "@/components/microsite/OrganizerMicrositePreview";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOrganizerSite,
  saveOrganizerSite,
  type OrganizerSiteSection,
  type OrganizerSiteTheme,
} from "@/store/slices/organizerSiteSlice";
import { eventPublicSubdomainUrl, defaultApexHostname } from "@shared/eventSubdomain";
import { resolveApexHostname } from "@/utils/hostContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTION_KEYS = [
  "hero",
  "about",
  "upcoming_events",
  "sponsors",
  "faq",
  "footer_links",
] as const;

/** Organizer microsite theme editor — live preview uses full screen width. */
export default function SiteEditor() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { site, loading, saving, error } = useAppSelector((s) => s.organizerSite);
  const role = useAppSelector((s) => s.staffAuth.role);

  const [subdomain, setSubdomain] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "suspended">(
    "draft",
  );
  const [localeDefault, setLocaleDefault] = useState<"es" | "en">("es");
  const [theme, setTheme] = useState<OrganizerSiteTheme | null>(null);
  const [sections, setSections] = useState<
    Record<string, { enabled: boolean; sortOrder: number }>
  >({});

  useEffect(() => {
    if (role === "organizer") void dispatch(fetchOrganizerSite());
  }, [dispatch, role]);

  useEffect(() => {
    if (!site) return;
    setSubdomain(site.subdomain);
    setStatus(
      site.status === "published" || site.status === "suspended"
        ? site.status
        : "draft",
    );
    setLocaleDefault(site.localeDefault === "en" ? "en" : "es");
    setTheme(site.theme);
    const next: Record<string, { enabled: boolean; sortOrder: number }> = {};
    for (const key of SECTION_KEYS) {
      const found = site.sections.find((s) => s.sectionKey === key);
      next[key] = {
        enabled: found?.enabled ?? (key !== "sponsors" && key !== "faq"),
        sortOrder: found?.sortOrder ?? SECTION_KEYS.indexOf(key),
      };
    }
    setSections(next);
  }, [site]);

  const previewUrl = useMemo(() => {
    if (!subdomain) return "";
    const apex =
      typeof window !== "undefined"
        ? resolveApexHostname()
        : defaultApexHostname();
    const protocol =
      typeof window !== "undefined"
        ? window.location.protocol.replace(":", "")
        : "https";
    return eventPublicSubdomainUrl(subdomain, apex, protocol);
  }, [subdomain]);

  const previewSections: OrganizerSiteSection[] = useMemo(
    () =>
      SECTION_KEYS.map((key) => ({
        sectionKey: key,
        enabled: sections[key]?.enabled ?? true,
        sortOrder: sections[key]?.sortOrder ?? 0,
        contentJson: {},
      })),
    [sections],
  );

  async function handleSave(nextStatus?: "draft" | "published") {
    if (!theme) return;
    const result = await dispatch(
      saveOrganizerSite({
        subdomain,
        status: nextStatus ?? status,
        localeDefault,
        theme,
        sections: previewSections,
      }),
    );
    if (saveOrganizerSite.fulfilled.match(result)) {
      toast.success(t("staffPortal.siteEditor.saved"));
      if (nextStatus) setStatus(nextStatus);
    } else {
      toast.error(
        String(result.payload || t("staffPortal.siteEditor.saveFailed")),
      );
    }
  }

  if (role !== "organizer") {
    return (
      <div className="w-full max-w-full min-w-0 p-6 text-sm text-muted-foreground">
        {t("staffPortal.siteEditor.organizerOnly")}
      </div>
    );
  }

  if (loading && !site) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!theme || !site) {
    return (
      <div className="w-full max-w-full min-w-0 p-6 text-sm text-muted-foreground">
        {error || t("staffPortal.siteEditor.loadFailed")}
      </div>
    );
  }

  const field =
    "w-full h-11 px-3 rounded-xl border border-border bg-background text-sm min-w-0";
  const label =
    "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const saveBar = (
    <div className="flex flex-col gap-2 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave("draft")}
          className="h-11 px-4 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60 min-w-0"
        >
          {saving
            ? t("staffPortal.siteEditor.saving")
            : t("staffPortal.siteEditor.saveDraft")}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave("published")}
          className="h-11 px-4 rounded-xl btn-primary text-sm font-semibold disabled:opacity-60 min-w-0"
        >
          {saving
            ? t("staffPortal.siteEditor.saving")
            : t("staffPortal.siteEditor.publish")}
        </button>
        <Link
          to="/staff"
          className="h-11 px-3 inline-flex items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:underline"
        >
          {t("staffPortal.siteEditor.backDashboard")}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground max-w-xl break-words">
        {t("staffPortal.siteEditor.publishHint")}
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-none min-w-0 overflow-x-clip space-y-4 md:space-y-5">
      <MetaHelmet
        title={t("staffPortal.siteEditor.metaTitle")}
        description={t("staffPortal.siteEditor.metaDescription")}
      />
      <StaffPageHeader
        titleSize="large"
        title={t("staffPortal.siteEditor.title")}
        subtitle={t("staffPortal.siteEditor.subtitle")}
        actions={saveBar}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div
        className={cn(
          "grid w-full min-w-0 gap-4 lg:gap-5",
          "grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]",
          "items-start",
        )}
      >
        {/* Editor controls — scrolls independently on large screens */}
        <aside className="w-full min-w-0 space-y-4 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:pr-1 lg:sticky lg:top-3">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="space-y-2 min-w-0">
                <label className={label}>
                  {t("staffPortal.siteEditor.subdomain")}
                </label>
                <input
                  className={field}
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  autoComplete="off"
                />
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline break-all"
                  >
                    {previewUrl}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 min-w-0">
                  <label className={label}>
                    {t("staffPortal.siteEditor.locale")}
                  </label>
                  <select
                    className={field}
                    value={localeDefault}
                    onChange={(e) =>
                      setLocaleDefault(e.target.value === "en" ? "en" : "es")
                    }
                  >
                    <option value="es">ES</option>
                    <option value="en">EN</option>
                  </select>
                </div>
                <div className="space-y-2 min-w-0">
                  <label className={label}>
                    {t("staffPortal.siteEditor.statusLabel")}
                  </label>
                  <p className="h-11 flex items-center text-sm font-semibold capitalize">
                    {status}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <h2 className="font-semibold">
              {t("staffPortal.siteEditor.colorsTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {(
                [
                  ["primaryColor", t("staffPortal.siteEditor.primary")],
                  ["secondaryColor", t("staffPortal.siteEditor.secondary")],
                  ["accentColor", t("staffPortal.siteEditor.accent")],
                  ["backgroundColor", t("staffPortal.siteEditor.background")],
                  ["textColor", t("staffPortal.siteEditor.text")],
                ] as const
              ).map(([key, lab]) => (
                <label key={key} className="space-y-1.5 min-w-0">
                  <span className={label}>{lab}</span>
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="color"
                      className="h-11 w-12 rounded-lg border border-border bg-background shrink-0"
                      value={theme[key]}
                      onChange={(e) =>
                        setTheme({ ...theme, [key]: e.target.value })
                      }
                    />
                    <input
                      className={field}
                      value={theme[key]}
                      onChange={(e) =>
                        setTheme({ ...theme, [key]: e.target.value })
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
            <label className="space-y-1.5 block min-w-0">
              <span className={label}>{t("staffPortal.siteEditor.tagline")}</span>
              <input
                className={field}
                value={theme.tagline || ""}
                onChange={(e) =>
                  setTheme({ ...theme, tagline: e.target.value || null })
                }
              />
            </label>
            <label className="space-y-1.5 block min-w-0">
              <span className={label}>{t("staffPortal.siteEditor.logoUrl")}</span>
              <input
                className={field}
                value={theme.logoUrl || ""}
                onChange={(e) =>
                  setTheme({ ...theme, logoUrl: e.target.value || null })
                }
                placeholder="https://"
              />
            </label>
            <label className="space-y-1.5 block min-w-0">
              <span className={label}>{t("staffPortal.siteEditor.heroUrl")}</span>
              <input
                className={field}
                value={theme.heroImageUrl || ""}
                onChange={(e) =>
                  setTheme({ ...theme, heroImageUrl: e.target.value || null })
                }
                placeholder="https://"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold">
              {t("staffPortal.siteEditor.sectionsTitle")}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {SECTION_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm rounded-xl border border-border px-3 py-2.5 min-w-0"
                >
                  <input
                    type="checkbox"
                    checked={sections[key]?.enabled ?? false}
                    onChange={(e) =>
                      setSections({
                        ...sections,
                        [key]: {
                          enabled: e.target.checked,
                          sortOrder: sections[key]?.sortOrder ?? 0,
                        },
                      })
                    }
                  />
                  <span className="truncate">{key}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold">
              {t("staffPortal.siteEditor.legalTitle")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed break-words">
              {t("staffPortal.siteEditor.legalMovedHint")}
            </p>
            <Link
              to="/staff/legal"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-muted/50"
            >
              {t("staffPortal.siteEditor.openLegalEditor")}
            </Link>
          </section>

          <div className="lg:hidden pb-2">{saveBar}</div>
        </aside>

        {/* Live microsite preview — grows with remaining viewport width */}
        <section className="w-full min-w-0 flex flex-col gap-3 lg:sticky lg:top-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <MonitorSmartphone className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-semibold truncate">
                {t("staffPortal.siteEditor.previewTitle")}
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground shrink-0">
              {t("staffPortal.siteEditor.previewLive")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 overflow-hidden shadow-sm min-w-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 min-w-0">
              <span className="flex gap-1.5 shrink-0" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
              </span>
              <div className="min-w-0 flex-1 rounded-md bg-background border border-border px-2.5 py-1 text-[11px] text-muted-foreground truncate font-mono">
                {previewUrl || t("staffPortal.siteEditor.previewUrlPlaceholder")}
              </div>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-primary hover:opacity-80"
                  aria-label={t("staffPortal.siteEditor.openPreview")}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}
            </div>

            <div className="max-h-[min(78dvh,920px)] overflow-y-auto overflow-x-clip bg-background">
              <OrganizerMicrositePreview
                organizerName={site.organizerName}
                theme={theme}
                sections={previewSections}
                events={site.events ?? []}
                showUnpublishedEvents
                interactive={false}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
