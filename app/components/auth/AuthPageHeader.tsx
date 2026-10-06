import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Pace compact header on athlete/staff login form column */
export default function AuthPageHeader() {
  const { t } = useTranslation();

  return (
    <header className="pace-header pace-header--compact sticky top-0 z-20 w-full max-w-full min-w-0 overflow-x-clip shrink-0">
      <Link className="pace-wordmark" to="/" aria-label={t("landing.ariaHome")}>
        atleita<span>.</span>
      </Link>
      <div className="pace-header-actions">
        <LanguageSwitcher variant="ghost" className="pace-header-lang" />
        <Link className="pace-header-enter" to="/">
          {t("common.back")}
        </Link>
      </div>
    </header>
  );
}
