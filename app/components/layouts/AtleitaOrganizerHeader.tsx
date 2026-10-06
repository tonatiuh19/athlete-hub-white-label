import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AtleitaWordmark from "@/components/brand/AtleitaWordmark";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Minimal Atleita chrome for organizer onboarding / staff entry.
 * Never use athlete-marketplace Atleita HomeNavbar here.
 */
export default function AtleitaOrganizerHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md w-full max-w-full min-w-0 overflow-x-clip">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 min-w-0">
        <AtleitaWordmark label={t("landing.ariaHome")} />
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher variant="ghost" />
          <Link
            to="/organizers/login"
            className="h-10 px-3 sm:px-4 inline-flex items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
          >
            {t("landing.enter")}
          </Link>
        </div>
      </div>
    </header>
  );
}
