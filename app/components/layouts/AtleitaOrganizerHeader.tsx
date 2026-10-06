import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Pace marketing chrome for organizer onboarding / staff entry.
 * Matches home `.pace-header` — never athlete-marketplace HomeNavbar.
 */
export default function AtleitaOrganizerHeader() {
  const { t } = useTranslation();

  return (
    <header className="pace-header pace-header--compact sticky top-0 z-50 w-full max-w-full min-w-0 overflow-x-clip">
      <Link className="pace-wordmark" to="/" aria-label={t("landing.ariaHome")}>
        atleita<span>.</span>
      </Link>
      <div className="pace-header-actions">
        <LanguageSwitcher variant="ghost" className="pace-header-lang" />
        <Link className="pace-header-enter" to="/organizers/login">
          {t("landing.enter")}
        </Link>
      </div>
    </header>
  );
}
