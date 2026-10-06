import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Scale } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import RichHtmlEditor from "@/components/editor/RichHtmlEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOrganizerSite,
  saveOrganizerSite,
} from "@/store/slices/organizerSiteSlice";
import { isOrganizerSiteLegalReadyFromDocs } from "@/utils/organizerSiteLegal";
import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LegalDraft = {
  title: string;
  bodyHtml: string;
};

const DOCS = [
  { key: "termsEs" as const, documentKey: "terms" as const, labelKey: "terms" },
  {
    key: "privacyEs" as const,
    documentKey: "privacy" as const,
    labelKey: "privacy",
  },
  { key: "refundEs" as const, documentKey: "refund" as const, labelKey: "refund" },
];

/**
 * Dedicated organizer legal editor (ES terms / privacy / refunds).
 * Required before event submit + admin approval.
 */
export default function OrganizerLegal() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { site, loading, saving, error } = useAppSelector((s) => s.organizerSite);
  const role = useAppSelector((s) => s.staffAuth.role);

  const [legal, setLegal] = useState<Record<(typeof DOCS)[number]["key"], LegalDraft>>({
    termsEs: { title: "Términos", bodyHtml: "" },
    privacyEs: { title: "Privacidad", bodyHtml: "" },
    refundEs: { title: "Reembolsos", bodyHtml: "" },
  });

  useEffect(() => {
    if (role === "organizer") void dispatch(fetchOrganizerSite());
  }, [dispatch, role]);

  useEffect(() => {
    if (!site) return;
    const pick = (documentKey: "terms" | "privacy" | "refund", fallbackTitle: string) => {
      const found = site.legal.find(
        (d) => d.documentKey === documentKey && d.locale === "es",
      );
      return {
        title: found?.title || fallbackTitle,
        bodyHtml: normalizeRichHtmlForCompare(found?.bodyHtml) || "",
      };
    };
    setLegal({
      termsEs: pick("terms", "Términos"),
      privacyEs: pick("privacy", "Privacidad"),
      refundEs: pick("refund", "Reembolsos"),
    });
  }, [site]);

  const ready = useMemo(
    () =>
      isOrganizerSiteLegalReadyFromDocs([
        { documentKey: "terms", locale: "es", bodyHtml: legal.termsEs.bodyHtml },
        { documentKey: "privacy", locale: "es", bodyHtml: legal.privacyEs.bodyHtml },
        { documentKey: "refund", locale: "es", bodyHtml: legal.refundEs.bodyHtml },
      ]),
    [legal],
  );

  async function handleSave() {
    if (!site) return;
    const result = await dispatch(
      saveOrganizerSite({
        legal: DOCS.map((doc) => ({
          documentKey: doc.documentKey,
          locale: "es" as const,
          title: legal[doc.key].title.trim() || t(`staffPortal.organizerLegal.docs.${doc.labelKey}`),
          bodyHtml: legal[doc.key].bodyHtml || "<p></p>",
        })),
      }),
    );
    if (saveOrganizerSite.fulfilled.match(result)) {
      toast.success(t("staffPortal.organizerLegal.saved"));
    } else {
      toast.error(String(result.payload || t("staffPortal.organizerLegal.saveFailed")));
    }
  }

  if (role !== "organizer") {
    return (
      <div className="w-full max-w-full min-w-0 p-6 text-sm text-muted-foreground">
        {t("staffPortal.organizerLegal.organizerOnly")}
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

  if (!site) {
    return (
      <div className="w-full max-w-full min-w-0 p-6 text-sm text-muted-foreground">
        {error || t("staffPortal.organizerLegal.loadFailed")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 overflow-x-clip space-y-5 px-0 sm:px-0 pb-8">
      <MetaHelmet
        title={t("staffPortal.organizerLegal.metaTitle")}
        description={t("staffPortal.organizerLegal.metaDescription")}
      />
      <StaffPageHeader
        titleSize="large"
        title={t("staffPortal.organizerLegal.title")}
        subtitle={t("staffPortal.organizerLegal.subtitle")}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <Button
              type="button"
              className="h-11"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("staffPortal.organizerLegal.saving")}
                </>
              ) : (
                t("staffPortal.organizerLegal.save")
              )}
            </Button>
            <Button asChild type="button" variant="outline" className="h-11">
              <Link to="/staff/site">{t("staffPortal.organizerLegal.openSiteEditor")}</Link>
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "rounded-2xl border p-4 sm:p-5 space-y-2 min-w-0",
          ready
            ? "border-accent/40 bg-accent/10"
            : "border-destructive/30 bg-destructive/5",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Scale className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold">
              {ready
                ? t("staffPortal.organizerLegal.readyTitle")
                : t("staffPortal.organizerLegal.incompleteTitle")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {t("staffPortal.organizerLegal.whyRequired")}
            </p>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-6">
        {DOCS.map((doc) => (
          <section
            key={doc.key}
            className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 space-y-3 min-w-0 overflow-x-clip"
          >
            <div>
              <h2 className="text-base font-semibold">
                {t(`staffPortal.organizerLegal.docs.${doc.labelKey}`)}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(`staffPortal.organizerLegal.docHints.${doc.labelKey}`)}
              </p>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor={`legal-title-${doc.key}`}>
                {t("staffPortal.organizerLegal.docTitle")}
              </Label>
              <Input
                id={`legal-title-${doc.key}`}
                className="h-11"
                value={legal[doc.key].title}
                onChange={(e) =>
                  setLegal((prev) => ({
                    ...prev,
                    [doc.key]: { ...prev[doc.key], title: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>{t("staffPortal.organizerLegal.docBody")}</Label>
              <RichHtmlEditor
                value={legal[doc.key].bodyHtml}
                onChange={(html) =>
                  setLegal((prev) => ({
                    ...prev,
                    [doc.key]: { ...prev[doc.key], bodyHtml: html },
                  }))
                }
                placeholder={t("staffPortal.organizerLegal.docBodyPlaceholder")}
                className="min-w-0"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
