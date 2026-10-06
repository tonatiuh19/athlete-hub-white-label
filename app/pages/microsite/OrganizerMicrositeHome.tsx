import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import OrganizerMicrositePreview from "@/components/microsite/OrganizerMicrositePreview";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearPublicOrganizerSite,
  fetchPublicOrganizerSite,
} from "@/store/slices/organizerSiteSlice";
import { getCanonicalSiteOrigin } from "@/lib/siteMeta";

type Props = {
  subdomain: string;
};

/** Published organizer microsite home on vanity host. */
export default function OrganizerMicrositeHome({ subdomain }: Props) {
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

  useEffect(() => {
    if (!error) return;
    const apex = getCanonicalSiteOrigin();
    const timer = window.setTimeout(() => {
      window.location.replace(`${apex}/`);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [error]);

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

  return (
    <>
      <MetaHelmet
        title={`${site.organizerName} — Atleita`}
        description={site.theme.tagline || site.organizerName}
        path="/"
      />
      <OrganizerMicrositePreview
        className="min-h-[100dvh]"
        organizerName={site.organizerName}
        theme={site.theme}
        sections={site.sections}
        events={site.events ?? []}
        interactive
        poweredByHref={getCanonicalSiteOrigin()}
      />
    </>
  );
}
