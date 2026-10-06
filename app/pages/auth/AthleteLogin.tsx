import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import {
  Footprints,
  Mail,
  Loader2,
  CheckCircle,
  Star,
  MapPin,
  User,
  ArrowLeft,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import AuthFlowLoadingPanel from "@/components/auth/AuthFlowLoadingPanel";
import AuthPageHeader from "@/components/auth/AuthPageHeader";
import AuthFormError from "@/components/auth/AuthFormError";
import AthleteOnboardingFields from "@/components/auth/AthleteOnboardingFields";
import OtpInput from "@/components/OtpInput";
import { ATHLETE_LOGIN_VIDEO_URL } from "@/constants/atleitaBrand";
import ClerkOAuthButtons from "@/components/ClerkOAuthButtons";
import ClerkLoadedGate from "@/components/auth/ClerkLoadedGate";
import AthleteLoginClerkResume from "@/components/auth/AthleteLoginClerkResume";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  athleteDateOfBirthSchema,
  athleteGenderSchema,
} from "@/validation/athleteOnboardingSchema";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  checkAthleteEmail,
  clearAthleteError,
  registerAthlete,
  requestAthleteOtp,
  verifyAthleteOtp,
} from "@/store/slices/athleteAuthSlice";
import { getAthleteToken } from "@/lib/api";
import { CLERK_SSO_CALLBACK_PATH } from "@/config/clerkUrls";
import { isAthleteOauthCompleting } from "@/utils/athleteSsoUx";
import LegalConsentNotice from "@/components/legal/LegalConsentNotice";
import { legalTermsAcceptanceSchema } from "@/validation/legalConsentSchema";
import { athletePostLoginPath } from "@/utils/athletePostLoginPath";

type AuthStep = "identify" | "code" | "register" | "socialLogin";

export default function AthleteLogin() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const postLoginPath = athletePostLoginPath({
    search: location.search,
    from: (location.state as { from?: string } | null)?.from,
  });
  const {
    checkingEmail,
    registering,
    requestingOtp,
    verifyingOtp,
    error,
    otpSentTo,
    syncingClerk,
  } = useAppSelector((s) => s.athleteAuth);
  const [step, setStep] = useState<AuthStep>("identify");
  const [email, setEmail] = useState("");
  const athleteToken = useAppSelector((s) => s.athleteAuth.token);

  useEffect(() => {
    if (athleteToken || getAthleteToken()) {
      navigate(postLoginPath, { replace: true });
    }
  }, [athleteToken, navigate, postLoginPath]);

  const stats = useMemo(
    () => [
      { value: "50K+", label: t("auth.athlete.statAthletes"), icon: Footprints },
      { value: "200+", label: t("auth.athlete.statEvents"), icon: MapPin },
      { value: "4.9", label: t("auth.athlete.statRating"), icon: Star },
    ],
    [t],
  );

  const testimonials = useMemo(
    () => [
      {
        quote: t("auth.athlete.testimonial1Quote"),
        name: t("auth.athlete.testimonial1Name"),
        detail: t("auth.athlete.testimonial1Detail"),
        initial: "M",
      },
      {
        quote: t("auth.athlete.testimonial2Quote"),
        name: t("auth.athlete.testimonial2Name"),
        detail: t("auth.athlete.testimonial2Detail"),
        initial: "C",
      },
      {
        quote: t("auth.athlete.testimonial3Quote"),
        name: t("auth.athlete.testimonial3Name"),
        detail: t("auth.athlete.testimonial3Detail"),
        initial: "A",
      },
    ],
    [t],
  );

  const goIdentify = () => {
    dispatch(clearAthleteError());
    setStep("identify");
  };

  const identifyForm = useFormik({
    initialValues: { email: "" },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t("common.invalidEmail"))
        .required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const normalized = values.email.trim().toLowerCase();
      const check = await dispatch(checkAthleteEmail({ email: normalized }));
      if (checkAthleteEmail.rejected.match(check)) return;
      setEmail(normalized);
      const { exists, hasPassword, hasSocialLogin } = check.payload!;
      if (exists && hasSocialLogin && !hasPassword) {
        setStep("socialLogin");
        return;
      }
      if (exists) {
        const otp = await dispatch(requestAthleteOtp({ email: normalized }));
        if (requestAthleteOtp.fulfilled.match(otp)) setStep("code");
        return;
      }
      setStep("register");
    },
  });

  const codeForm = useFormik({
    initialValues: { code: "" },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      code: Yup.string()
        .matches(/^\d{6}$/, t("auth.athlete.otpInvalid"))
        .required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        verifyAthleteOtp({
          email: otpSentTo || email,
          code: values.code,
        }),
      );
      if (verifyAthleteOtp.fulfilled.match(result)) {
        navigate(postLoginPath, { replace: true });
      }
    },
  });

  const registerForm = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "" as "" | "male" | "female" | "other" | "prefer_not_to_say",
      acceptedTerms: false,
    },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      firstName: Yup.string().trim().required(t("common.required")),
      lastName: Yup.string().trim().required(t("common.required")),
      dateOfBirth: athleteDateOfBirthSchema(t),
      gender: athleteGenderSchema(t),
      acceptedTerms: legalTermsAcceptanceSchema(t),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        registerAthlete({
          email,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          dateOfBirth: values.dateOfBirth,
          gender: values.gender || null,
        }),
      );
      if (registerAthlete.fulfilled.match(result)) {
        if ("requiresOtp" in result.payload && result.payload.requiresOtp) {
          setStep("code");
          return;
        }
        if ("token" in result.payload) {
          navigate(postLoginPath, { replace: true });
        }
      }
    },
  });

  const oauthCallbackRedirect =
    isAthleteOauthCompleting() && location.pathname !== CLERK_SSO_CALLBACK_PATH
      ? `${CLERK_SSO_CALLBACK_PATH}${location.search}${location.hash}`
      : null;

  const heading =
    step === "identify" ? (
      <>
        {t("auth.athlete.titleIdentify")}{" "}
        <span className="text-gradient">{t("auth.athlete.titleHighlight")}</span>
      </>
    ) : step === "register" ? (
      <>
        {t("auth.athlete.titleRegister")}{" "}
        <span className="text-gradient">{t("auth.athlete.titleRegisterHighlight")}</span>
      </>
    ) : step === "socialLogin" ? (
      t("auth.athlete.socialOnlyTitle")
    ) : (
      t("auth.athlete.titleOtp")
    );

  const subtitle =
    step === "identify"
      ? t("auth.athlete.subtitleEmailOnly")
      : step === "register"
        ? t("auth.athlete.subtitleRegisterPasswordless")
        : step === "socialLogin"
          ? t("auth.athlete.socialOnlySubtitle", { email })
          : t("auth.athlete.subtitleOtp", { email: otpSentTo || email });

  if (oauthCallbackRedirect) {
    return <Navigate to={oauthCallbackRedirect} replace />;
  }

  if (syncingClerk) {
    return (
      <>
        <MetaHelmet title={t("auth.sso.completing")} noindex />
        <AuthFlowLoadingPanel
          statusMessage={t("auth.sso.syncingAccount")}
          step="sync"
        />
      </>
    );
  }

  const busyIdentify = checkingEmail || requestingOtp;

  return (
    <div className="pace-site h-[100dvh] overflow-hidden flex w-full max-w-full min-w-0">
      <ClerkLoadedGate>
        <AthleteLoginClerkResume postLoginPath={postLoginPath} />
      </ClerkLoadedGate>
      <MetaHelmet
        title={t("auth.athlete.metaTitle")}
        description={t("auth.athlete.metaDescription")}
        path="/login"
      />

      <div className="flex-1 lg:max-w-[480px] flex flex-col overflow-y-auto border-r border-[#e4e8e3]">
        <AuthPageHeader />

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-6">
          <div className="w-full max-w-[340px] mx-auto animate-slide-up">
            <div className="pace-wizard-header mb-8 text-center">
              <h1 className="pace-wizard-title">{heading}</h1>
              <p className="pace-wizard-hint">{subtitle}</p>
            </div>

            {step === "identify" && (
              <div className="space-y-5">
                <form onSubmit={identifyForm.handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="athlete-email" className="block text-sm font-medium">
                      {t("common.email")}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        id="athlete-email"
                        type="email"
                        {...identifyForm.getFieldProps("email")}
                        className="w-full h-12 pl-10 pr-4 border border-[#ccd8ca] bg-white focus:border-[#496d4f] outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-[rgb(142_170_69_/_28%)] transition-all text-[13px] rounded-[2px]"
                        placeholder={t("auth.athlete.emailPlaceholder")}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {identifyForm.submitCount > 0 && identifyForm.errors.email && (
                      <p className="text-xs text-destructive">{identifyForm.errors.email}</p>
                    )}
                  </div>
                  <AuthFormError error={error} />
                  <button
                    type="submit"
                    disabled={busyIdentify}
                    className="pace-wizard-next w-full disabled:opacity-60"
                  >
                    {busyIdentify ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("common.continue")
                    )}
                  </button>
                </form>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-background text-xs text-muted-foreground">
                      {t("common.orContinueWith")}
                    </span>
                  </div>
                </div>
                <ClerkOAuthButtons />
              </div>
            )}

            {step === "code" && (
              <form onSubmit={codeForm.handleSubmit} className="space-y-4">
                <div className="rounded-[2px] border border-[#ccd8ca] bg-white px-3 py-2 text-xs text-muted-foreground truncate">
                  {otpSentTo || email}
                </div>
                <OtpInput
                  variant="pace"
                  value={codeForm.values.code}
                  onChange={(code) => codeForm.setFieldValue("code", code)}
                  onComplete={(code) => {
                    if (verifyingOtp) return;
                    void codeForm.setFieldValue("code", code).then(() => {
                      void codeForm.submitForm();
                    });
                  }}
                />
                {codeForm.submitCount > 0 && codeForm.errors.code && (
                  <p className="text-xs text-destructive">{codeForm.errors.code}</p>
                )}
                <AuthFormError error={error} />
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="pace-wizard-next w-full disabled:opacity-60"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("auth.athlete.verifying")}
                    </>
                  ) : (
                    t("auth.athlete.verifyContinue")
                  )}
                </button>
                <button
                  type="button"
                  disabled={requestingOtp}
                  onClick={() => {
                    void dispatch(
                      requestAthleteOtp({ email: otpSentTo || email }),
                    );
                  }}
                  className="w-full text-sm text-primary hover:underline disabled:opacity-60"
                >
                  {requestingOtp
                    ? t("auth.athlete.resendingCode")
                    : t("auth.athlete.resendCode")}
                </button>
                <button
                  type="button"
                  onClick={goIdentify}
                  className="w-full text-sm text-muted-foreground hover:text-primary py-1 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t("registrationWizard.auth.changeEmail")}
                </button>
              </form>
            )}

            {step === "register" && (
              <form onSubmit={registerForm.handleSubmit} className="space-y-4">
                <div className="rounded-[2px] border border-[#ccd8ca] bg-white px-3 py-2 text-xs text-muted-foreground truncate">
                  {email}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="athlete-first-name" className="block text-sm font-medium">
                    {t("auth.athlete.firstNameLabel")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="athlete-first-name"
                      type="text"
                      {...registerForm.getFieldProps("firstName")}
                      className="w-full h-12 pl-10 pr-4 border border-[#ccd8ca] bg-white focus:border-[#496d4f] outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-[rgb(142_170_69_/_28%)] transition-all text-[13px] rounded-[2px]"
                      autoComplete="given-name"
                      autoFocus
                    />
                  </div>
                  {registerForm.submitCount > 0 && registerForm.errors.firstName && (
                    <p className="text-xs text-destructive">{registerForm.errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="athlete-last-name" className="block text-sm font-medium">
                    {t("auth.athlete.lastNameLabel")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="athlete-last-name"
                      type="text"
                      {...registerForm.getFieldProps("lastName")}
                      className="w-full h-12 pl-10 pr-4 border border-[#ccd8ca] bg-white focus:border-[#496d4f] outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-[rgb(142_170_69_/_28%)] transition-all text-[13px] rounded-[2px]"
                      autoComplete="family-name"
                    />
                  </div>
                  {registerForm.submitCount > 0 && registerForm.errors.lastName && (
                    <p className="text-xs text-destructive">{registerForm.errors.lastName}</p>
                  )}
                </div>
                <AthleteOnboardingFields
                  idPrefix="athlete-register"
                  dateOfBirth={registerForm.values.dateOfBirth}
                  gender={registerForm.values.gender}
                  onDateOfBirthChange={(v) => registerForm.setFieldValue("dateOfBirth", v)}
                  onGenderChange={(v) => registerForm.setFieldValue("gender", v)}
                  dateOfBirthError={
                    registerForm.submitCount > 0 && registerForm.errors.dateOfBirth
                      ? String(registerForm.errors.dateOfBirth)
                      : undefined
                  }
                  genderError={
                    registerForm.submitCount > 0 && registerForm.errors.gender
                      ? String(registerForm.errors.gender)
                      : undefined
                  }
                />
                <LegalConsentNotice
                  variant="athleteRegister"
                  showCheckbox
                  id="athlete-register-legal"
                  checked={registerForm.values.acceptedTerms}
                  onCheckedChange={(v) => registerForm.setFieldValue("acceptedTerms", v)}
                  error={
                    registerForm.submitCount > 0 && registerForm.errors.acceptedTerms
                      ? String(registerForm.errors.acceptedTerms)
                      : null
                  }
                />
                <AuthFormError error={error} />
                <button
                  type="submit"
                  disabled={registering}
                  className="pace-wizard-next w-full disabled:opacity-60"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("auth.athlete.sendingCode")}
                    </>
                  ) : (
                    t("auth.athlete.sendCodeContinue")
                  )}
                </button>
                <button
                  type="button"
                  onClick={goIdentify}
                  className="w-full text-sm text-muted-foreground hover:text-primary py-1 inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  {t("registrationWizard.auth.changeEmail")}
                </button>
              </form>
            )}

            {step === "socialLogin" && (
              <div className="space-y-5">
                <div className="rounded-[2px] border border-[#ccd8ca] bg-white px-3 py-2 text-xs text-muted-foreground truncate">
                  {email}
                </div>
                <LegalConsentNotice variant="athleteRegister" />
                <ClerkOAuthButtons />
                <button
                  type="button"
                  onClick={goIdentify}
                  className="w-full text-sm text-muted-foreground hover:text-primary py-1 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t("registrationWizard.auth.changeEmail")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 shrink-0">
          <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              {t("auth.athlete.trustSecure")}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              {t("common.instantQr")}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <LanguageSwitcher variant="ghost" />
          </div>
          <p className="text-center text-[11px] text-muted-foreground/50">
            {t("common.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

      <AuthBrandPanel
        videoUrl={ATHLETE_LOGIN_VIDEO_URL}
        badge=""
        headline={
          <>
            {t("auth.athlete.brandHeadline")}{" "}
            <span className="text-primary">{t("auth.athlete.brandHeadlineHighlight")}</span>{" "}
            {t("auth.athlete.brandHeadlineEnd")}
          </>
        }
        subheadline={t("auth.athlete.brandSub")}
        stats={stats}
        testimonials={testimonials}
        footerNote={t("auth.athlete.brandFooter")}
      />
    </div>
  );
}
