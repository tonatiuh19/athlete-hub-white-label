import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearPublicOrganizerSite,
  fetchPublicOrganizerSite,
} from "@/store/slices/organizerSiteSlice";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import type { OrganizerSiteLegalKey } from "@/utils/organizerSiteLegal";
import { getCanonicalSiteOrigin } from "@/lib/siteMeta";

type Props = {
  subdomain: string;
  documentKey: OrganizerSiteLegalKey;
};

/** Vanity-host organizer legal document (terms / privacy / refund). */
export default function OrganizerMicrositeLegalPage({
  subdomain,
  documentKey,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const site = useAppSelector((s) => s.organizerSite.publicSite);
  const error = useAppSelector((s) => s.organizerSite.publicError);

  useEffect(() => {
    void dispatch(fetchPublicOrganizerSite(subdomain));
    return () => {
      dispatch(clearPublicOrganizerSite());
    };
  }, [dispatch, subdomain]);

  const key = documentKey;

  const doc = useMemo(() => {
    if (!site) return null;
    return (
      site.legal.find((d) => d.documentKey === key && d.locale === "es") ??
      site.legal.find((d) => d.documentKey === key) ??
      null
    );
  }, [site, key]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">{t("microsite.notFound")}</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const title =
    doc?.title?.trim() ||
    t(`microsite.legalTitles.${key}`, { defaultValue: key });
  const html = sanitizeHtml(doc?.bodyHtml || `<p>${t("microsite.legalEmpty")}</p>`);

  return (
    <div
      className="min-h-[100dvh] w-full max-w-full min-w-0 overflow-x-clip"
      style={{
        backgroundColor: site.theme.backgroundColor,
        color: site.theme.textColor,
        fontFamily: site.theme.fontFamily,
      }}
    >
      <MetaHelmet
        title={`${title} — ${site.organizerName}`}
        description={site.theme.tagline || site.organizerName}
        path={`/legal/${key}`}
      />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("microsite.backToSite")}
          </Link>
        </Button>
        <article
          className="legal-prose rounded-2xl border p-6 md:p-10 min-w-0 break-words"
          style={{ borderColor: `${site.theme.primaryColor}22` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p className="mt-8 text-xs opacity-60">
          {t("microsite.poweredBy")}{" "}
          <a
            href={getCanonicalSiteOrigin()}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: site.theme.primaryColor }}
          >
            Atleita
          </a>
        </p>
      </div>
    </div>
  );
}
