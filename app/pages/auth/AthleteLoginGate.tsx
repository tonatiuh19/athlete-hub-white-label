import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { isAthleteLoginHost } from "@/utils/hostContext";
import AthleteLogin from "./AthleteLogin";

/** Apex blocks athlete login; vanity microsites keep the full OTP experience. */
export default function AthleteLoginGate() {
  const { t } = useTranslation();

  if (isAthleteLoginHost()) {
    return <AthleteLogin />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col w-full max-w-full min-w-0 overflow-x-clip">
      <MetaHelmet
        title={t("auth.athlete.apexBlocked.metaTitle")}
        description={t("auth.athlete.apexBlocked.metaDescription")}
        path="/login"
        noindex
      />
      <header className="px-4 sm:px-6 py-5 flex items-center justify-between gap-3 border-b border-border/60 min-w-0">
        <Link to="/" className="font-bold tracking-tight text-lg min-w-0 shrink">
          atleita<span className="text-primary">.</span>
        </Link>
        <LanguageSwitcher variant="ghost" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 min-w-0">
        <div className="max-w-md w-full min-w-0 text-center space-y-5 animate-slide-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("auth.athlete.apexBlocked.eyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
            {t("auth.athlete.apexBlocked.title")}
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
            {t("auth.athlete.apexBlocked.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 w-full">
            <Link
              to="/organizers/login"
              className="h-12 px-5 inline-flex items-center justify-center rounded-xl btn-primary text-sm font-semibold w-full sm:w-auto"
            >
              {t("auth.athlete.apexBlocked.organizerCta")}
            </Link>
            <Link
              to="/"
              className="h-12 px-5 inline-flex items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-secondary w-full sm:w-auto"
            >
              {t("auth.athlete.apexBlocked.homeCta")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
