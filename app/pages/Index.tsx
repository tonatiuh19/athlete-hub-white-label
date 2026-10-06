import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAppDispatch } from "@/store/hooks";
import { resetOrganizerSignup } from "@/store/slices/organizerSignupSlice";

function CtaArrowUpRight({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return <ArrowUpRight className={className} aria-hidden="true" />;
}

const FEATURE_KEYS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
] as const;

const SAMPLE_EVENT_KEYS = ["ridge", "city", "coastal"] as const;

const SAMPLE_EVENT_IMAGES: Record<
  (typeof SAMPLE_EVENT_KEYS)[number],
  { image: string }
> = {
  ridge: {
    image:
      "https://images.pexels.com/photos/31238485/pexels-photo-31238485.jpeg",
  },
  city: {
    image: "https://images.pexels.com/photos/4083911/pexels-photo-4083911.jpeg",
  },
  coastal: {
    image:
      "https://images.pexels.com/photos/31764047/pexels-photo-31764047.jpeg",
  },
};

export default function Index() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [heroVideoActive, setHeroVideoActive] = useState(false);
  const [ticketPrice, setTicketPrice] = useState(160);
  const [registrationCount, setRegistrationCount] = useState(2600);
  const [pricingCurrency, setPricingCurrency] = useState<"MXN" | "USD">("MXN");
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  function goOrganizerSignup() {
    dispatch(resetOrganizerSignup());
    navigate("/organizers/signup?step=owner");
  }

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const syncVideoPlayback = () => {
      const video = heroVideoRef.current;
      if (!video) return;
      if (motionPreference.matches) {
        video.pause();
        setHeroVideoActive(false);
      } else {
        void video.play().catch(() => setHeroVideoActive(false));
      }
    };

    syncVideoPlayback();
    motionPreference.addEventListener("change", syncVideoPlayback);
    return () =>
      motionPreference.removeEventListener("change", syncVideoPlayback);
  }, []);

  const numberLocale = i18n.language?.startsWith("es") ? "es-MX" : "en-US";
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(numberLocale, {
        style: "currency",
        currency: pricingCurrency,
        maximumFractionDigits: 0,
      }),
    [numberLocale, pricingCurrency],
  );
  const grossSales = ticketPrice * registrationCount;
  const allInFee = grossSales * 0.14;
  const organizerEarnings = grossSales * 0.03;
  const estimatedPayout = grossSales - allInFee + organizerEarnings;

  return (
    <div className="pace-site atleita-organizer-page w-full max-w-full min-w-0 overflow-x-clip">
      <MetaHelmet
        title={t("landing.metaTitle")}
        description={t("landing.metaDescription")}
        path="/"
      />
      <header className="pace-header">
        <a
          className="pace-wordmark"
          href="#top"
          aria-label={t("landing.ariaHome")}
        >
          atleita<span>.</span>
        </a>
        <nav className="pace-nav" aria-label={t("landing.ariaMainNav")}>
          <a className="pace-nav-active" href="#organizers">
            {t("landing.navPlatform")}
          </a>
          <a href="#storefront">{t("landing.navWhiteLabel")}</a>
          <a href="#pricing">{t("landing.navPricing")}</a>
        </nav>
        <div className="pace-header-actions">
          <LanguageSwitcher variant="ghost" className="pace-header-lang" />
          <Link className="pace-header-enter" to="/organizers/login">
            {t("landing.enter")}
          </Link>
          <button
            className="pace-header-cta"
            type="button"
            onClick={goOrganizerSignup}
          >
            <span className="inline-flex items-center gap-1.5">
              {t("landing.startSetup")}
              <CtaArrowUpRight />
            </span>
          </button>
        </div>
      </header>

      <main id="top">
        <section
          className="pace-hero atleita-organizer-hero"
          aria-labelledby="hero-title"
        >
          <img
            className="pace-hero-image"
            src="https://images.pexels.com/photos/31238485/pexels-photo-31238485.jpeg"
            alt={t("landing.heroImageAlt")}
          />
          <video
            ref={heroVideoRef}
            className={`pace-hero-video${heroVideoActive ? " is-active" : ""}`}
            aria-hidden="true"
            tabIndex={-1}
            muted
            loop
            playsInline
            poster="https://images.pexels.com/photos/31238485/pexels-photo-31238485.jpeg"
            preload="auto"
            onPlaying={() => setHeroVideoActive(true)}
            onError={() => setHeroVideoActive(false)}
          >
            <source
              src="https://videos.pexels.com/video-files/5677398/5677398-hd_1280_720_24fps.mp4"
              type="video/mp4"
            />
          </video>
          <div className="pace-hero-shade" />
          <div className="pace-hero-content">
            <p className="pace-kicker">
              <span /> {t("landing.heroKicker")}
            </p>
            <h1 id="hero-title">
              {t("landing.heroTitleBefore")} <em>{t("landing.heroTitleEm")}</em>
            </h1>
            <p className="pace-hero-copy">{t("landing.heroCopy")}</p>
            <div className="atleita-hero-actions">
              <button
                className="pace-hero-button"
                type="button"
                onClick={goOrganizerSignup}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t("landing.heroCta")}
                  <CtaArrowUpRight />
                </span>
              </button>
              <a href="#pricing" className="atleita-hero-secondary inline-flex items-center gap-1.5">
                {t("landing.heroSecondary")}
                <ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="pace-hero-caption">
            <span>{t("landing.heroCaption1")}</span>
            <span>{t("landing.heroCaption2")}</span>
          </div>
        </section>

        <section
          className="pace-organizers atleita-platform"
          id="organizers"
          aria-labelledby="platform-title"
        >
          <div className="pace-organizer-intro">
            <p className="pace-eyebrow">{t("landing.platformEyebrow")}</p>
            <h2 id="platform-title">
              {t("landing.platformTitle")}
              <span>.</span>
            </h2>
            <p className="atleita-platform-copy">{t("landing.platformCopy")}</p>
            <button
              className="pace-organizer-cta"
              type="button"
              onClick={goOrganizerSignup}
            >
              <span className="inline-flex items-center gap-1.5">
                {t("landing.platformCta")}
                <CtaArrowUpRight />
              </span>
            </button>
          </div>
          <div className="pace-benefits atleita-feature-list">
            {FEATURE_KEYS.map((number) => (
              <article className="pace-benefit" key={number}>
                <span className="pace-benefit-number">{number}</span>
                <div>
                  <h3>{t(`landing.features.${number}.title`)}</h3>
                  <p>{t(`landing.features.${number}.body`)}</p>
                </div>
                <span className="pace-benefit-arrow" aria-hidden="true">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="atleita-storefront"
          id="storefront"
          aria-labelledby="storefront-title"
        >
          <div className="atleita-storefront-copy">
            <p className="pace-eyebrow">{t("landing.storefrontEyebrow")}</p>
            <h2 id="storefront-title">
              {t("landing.storefrontTitleBefore")}{" "}
              <em>{t("landing.storefrontTitleEm")}</em>
            </h2>
            <p>{t("landing.storefrontCopy")}</p>
            <button
              className="pace-organizer-cta"
              type="button"
              onClick={goOrganizerSignup}
            >
              <span className="inline-flex items-center gap-1.5">
                {t("landing.heroCta")}
                <CtaArrowUpRight />
              </span>
            </button>
          </div>
          <div
            className="atleita-browser-frame"
            aria-label={t("landing.demo.frameAria")}
          >
            <div className="atleita-browser-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <div>{t("landing.demo.domain")}</div>
            </div>
            <div className="atleita-demo-store">
              <header className="atleita-demo-header">
                <div className="atleita-demo-brand">
                  <span>{t("landing.demo.brandMark")}</span>
                  <strong>
                    {t("landing.demo.brandLine1")}
                    <br />
                    {t("landing.demo.brandLine2")}
                  </strong>
                </div>
                <span className="atleita-demo-nav">{t("landing.demo.nav")}</span>
                <span className="atleita-demo-action inline-flex items-center gap-1">
                  {t("landing.demo.action")}
                  <ArrowUpRight className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                </span>
              </header>
              <div className="atleita-demo-hero">
                <img
                  src="https://images.pexels.com/photos/31238485/pexels-photo-31238485.jpeg"
                  alt={t("landing.demo.heroAlt")}
                  loading="lazy"
                />
                <div className="atleita-demo-overlay" />
                <div className="atleita-demo-title">
                  <span>{t("landing.demo.heroKicker")}</span>
                  <h3>
                    {t("landing.demo.heroTitle1")}
                    <br />
                    {t("landing.demo.heroTitle2")}
                  </h3>
                  <span className="atleita-demo-button inline-flex items-center gap-1">
                    {t("landing.demo.heroCta")}
                    <ArrowDown className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  </span>
                </div>
                <span className="atleita-demo-tag">{t("landing.demo.tag")}</span>
              </div>
              <div className="atleita-demo-events">
                <div className="atleita-demo-events-heading">
                  <strong>{t("landing.demo.upNext")}</strong>
                  <span>{t("landing.demo.upNextSub")}</span>
                </div>
                <div className="atleita-demo-event-grid">
                  {SAMPLE_EVENT_KEYS.map((key) => (
                    <article className="atleita-demo-event" key={key}>
                      <img
                        src={SAMPLE_EVENT_IMAGES[key].image}
                        alt={t(`landing.demo.events.${key}.alt`)}
                        loading="lazy"
                      />
                      <div>
                        <span>{t(`landing.demo.events.${key}.date`)}</span>
                        <h4>{t(`landing.demo.events.${key}.name`)}</h4>
                        <span>
                          {t("landing.demo.entryFrom", {
                            price: t(`landing.demo.events.${key}.price`),
                          })}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="atleita-demo-powered">
                {t("landing.demo.powered")}
              </div>
            </div>
          </div>
        </section>

        <section
          className="atleita-pricing"
          id="pricing"
          aria-labelledby="pricing-title"
        >
          <div className="atleita-pricing-heading">
            <p className="pace-eyebrow">{t("landing.pricingEyebrow")}</p>
            <h2 id="pricing-title">
              {t("landing.pricingTitle")}
              <span>.</span>
            </h2>
            <p>{t("landing.pricingCopy")}</p>
          </div>
          <div className="atleita-pricing-layout">
            <div className="atleita-calculator">
              <div className="atleita-calculator-title">
                <span>{t("landing.calc.estimateTitle")}</span>
                <span>{t("landing.calc.allInFee")}</span>
              </div>
              <div className="atleita-currency-picker">
                <label htmlFor="pricing-currency">
                  {t("landing.calc.currencyLabel")}
                </label>
                <select
                  id="pricing-currency"
                  value={pricingCurrency}
                  onChange={(event) =>
                    setPricingCurrency(event.target.value as "MXN" | "USD")
                  }
                >
                  <option value="MXN">{t("landing.calc.currencyMxn")}</option>
                  <option value="USD">{t("landing.calc.currencyUsd")}</option>
                </select>
              </div>
              <div className="atleita-range-field">
                <div>
                  <label htmlFor="ticket-price">
                    {t("landing.calc.ticketPrice")}
                  </label>
                  <output htmlFor="ticket-price">
                    {currency.format(ticketPrice)}
                  </output>
                </div>
                <input
                  id="ticket-price"
                  type="range"
                  min="20"
                  max="250"
                  step="5"
                  value={ticketPrice}
                  onChange={(event) =>
                    setTicketPrice(Number(event.target.value))
                  }
                />
                <div className="atleita-range-limits">
                  <span>{currency.format(20)}</span>
                  <span>{currency.format(250)}</span>
                </div>
              </div>
              <div className="atleita-range-field">
                <div>
                  <label htmlFor="registration-count">
                    {t("landing.calc.registrations")}
                  </label>
                  <output htmlFor="registration-count">
                    {registrationCount.toLocaleString(numberLocale)}
                  </output>
                </div>
                <input
                  id="registration-count"
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={registrationCount}
                  onChange={(event) =>
                    setRegistrationCount(Number(event.target.value))
                  }
                />
                <div className="atleita-range-limits">
                  <span>50</span>
                  <span>{(5000).toLocaleString(numberLocale)}</span>
                </div>
              </div>
              <div className="atleita-fee-breakdown">
                <div>
                  <span>{t("landing.calc.grossSales")}</span>
                  <strong>{currency.format(grossSales)}</strong>
                </div>
                <div>
                  <span>
                    {t("landing.calc.transactionFee")}{" "}
                    <small>{t("landing.calc.feePercent")}</small>
                  </span>
                  <strong>−{currency.format(allInFee)}</strong>
                </div>
                <div>
                  <span>
                    {t("landing.calc.earningsShare")}{" "}
                    <small>{t("landing.calc.earningsPercent")}</small>
                  </span>
                  <strong>+{currency.format(organizerEarnings)}</strong>
                </div>
              </div>
              <div className="atleita-payout">
                <span>{t("landing.calc.estimatedPayout")}</span>
                <strong>{currency.format(estimatedPayout)}</strong>
                <small>{t("landing.calc.payoutPercent")}</small>
              </div>
              <p className="atleita-calculator-note">{t("landing.calc.note")}</p>
            </div>
            <div className="atleita-fee-explainer">
              <div className="atleita-fee-mark">
                14<span>%</span>
              </div>
              <h3>
                {t("landing.feeTitle1")}
                <br />
                {t("landing.feeTitle2")}
              </h3>
              <p>{t("landing.feeBody")}</p>
              <div className="atleita-fee-share">
                <span>{t("landing.feeShareLabel")}</span>
                <strong>3%</strong>
                <span>{t("landing.feeShareBody")}</span>
              </div>
              <p className="atleita-fee-net">{t("landing.feeNet")}</p>
              <button
                type="button"
                className="pace-organizer-cta"
                onClick={goOrganizerSignup}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t("landing.heroCta")}
                  <CtaArrowUpRight />
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="atleita-final-cta">
          <div>
            <p className="pace-eyebrow">{t("landing.finalEyebrow")}</p>
            <h2>
              {t("landing.finalTitle")}
              <span>.</span>
            </h2>
          </div>
          <button
            className="pace-hero-button"
            type="button"
            onClick={goOrganizerSignup}
          >
            <span className="inline-flex items-center gap-1.5">
              {t("landing.finalCta")}
              <CtaArrowUpRight />
            </span>
          </button>
        </section>
      </main>

      <footer className="pace-footer">
        <div className="pace-footer-main">
          <div className="pace-footer-brand">
            <a
              className="pace-wordmark"
              href="#top"
              aria-label={t("landing.ariaHome")}
            >
              atleita<span>.</span>
            </a>
            <p>
              {t("landing.brandLine1")}
              <br />
              {t("landing.brandLine2")}
              <br />
              {t("landing.brandLine3")}
            </p>
          </div>
          <div className="pace-footer-column">
            <h2>{t("landing.footerPlatform")}</h2>
            <a href="#organizers">{t("landing.footerTools")}</a>
            <a href="#storefront">{t("landing.footerPages")}</a>
            <a href="#pricing">{t("landing.footerPricing")}</a>
          </div>
          <div className="pace-footer-column">
            <h2>{t("landing.footerGetStarted")}</h2>
            <button
              type="button"
              onClick={goOrganizerSignup}
              className="inline-flex items-center gap-1.5"
            >
              {t("landing.footerSignup")}
              <CtaArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </button>
            <Link to="/organizers/login">{t("landing.enter")}</Link>
            <a href="#top" className="inline-flex items-center gap-1">
              {t("landing.footerTop")}
              <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="pace-footer-bottom">
          <span>{t("landing.copyright")}</span>
          <Link className="pace-footer-staff" to="/admin/login">
            {t("landing.footerStaff")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
