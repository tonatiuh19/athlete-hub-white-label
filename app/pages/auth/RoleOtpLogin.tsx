import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Loader2,
  CheckCircle,
  Users,
  Calendar,
  BarChart3,
  Palette,
  ArrowLeft,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import OtpInput from "@/components/OtpInput";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import AuthPageHeader from "@/components/auth/AuthPageHeader";
import AuthFormError from "@/components/auth/AuthFormError";
import { STAFF_LOGIN_VIDEO_URL } from "@/constants/atleitaBrand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { requestRoleOtp, verifyRoleOtp } from "@/store/slices/staffAuthSlice";
import { getStaffToken } from "@/lib/api";
import type { StaffRole } from "@shared/api";

type RoleOtpLoginProps = {
  role: StaffRole;
};

export default function RoleOtpLogin({ role }: RoleOtpLoginProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { requestingOtp, verifyingOtp, error, otpSentTo, token } = useAppSelector(
    (s) => s.staffAuth,
  );
  const [step, setStep] = useState<"email" | "code">("email");
  const i18nKey = role === "admin" ? "auth.admin" : "auth.organizer";
  const loginPath = role === "admin" ? "/admin/login" : "/organizers/login";

  useEffect(() => {
    if (token || getStaffToken()) {
      navigate(role === "organizer" ? "/staff?setup=site" : "/staff", {
        replace: true,
      });
    }
  }, [token, navigate, role]);

  const stats = useMemo(
    () =>
      role === "organizer"
        ? [
            { value: "1", label: t(`${i18nKey}.statSite`), icon: Palette },
            { value: "∞", label: t(`${i18nKey}.statEvents`), icon: Calendar },
            { value: "24/7", label: t(`${i18nKey}.statOps`), icon: Users },
          ]
        : [
            { value: "2K+", label: t(`${i18nKey}.statEvents`), icon: Calendar },
            {
              value: "500K+",
              label: t(`${i18nKey}.statRegistrations`),
              icon: Users,
            },
            {
              value: "98%",
              label: t(`${i18nKey}.statSatisfaction`),
              icon: BarChart3,
            },
          ],
    [t, role, i18nKey],
  );

  const testimonials = useMemo(
    () => [
      {
        quote: t(`${i18nKey}.testimonial1Quote`),
        name: t(`${i18nKey}.testimonial1Name`),
        detail: t(`${i18nKey}.testimonial1Detail`),
        initial: "R",
      },
      {
        quote: t(`${i18nKey}.testimonial2Quote`),
        name: t(`${i18nKey}.testimonial2Name`),
        detail: t(`${i18nKey}.testimonial2Detail`),
        initial: "E",
      },
    ],
    [t, i18nKey],
  );

  const emailForm = useFormik({
    initialValues: { email: "" },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t("common.invalidEmail"))
        .required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        requestRoleOtp({ email: values.email, role }),
      );
      if (requestRoleOtp.fulfilled.match(result)) setStep("code");
    },
  });

  const codeForm = useFormik({
    initialValues: { code: "" },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      code: Yup.string()
        .matches(/^\d{6}$/, t("common.sixDigits"))
        .required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        verifyRoleOtp({
          email: otpSentTo || emailForm.values.email,
          code: values.code,
          role,
        }),
      );
      if (verifyRoleOtp.fulfilled.match(result)) {
        navigate(role === "organizer" ? "/staff?setup=site" : "/staff", {
          replace: true,
        });
      }
    },
  });

  const email = otpSentTo || emailForm.values.email;

  return (
    <div className="h-[100dvh] overflow-hidden flex w-full max-w-full min-w-0 bg-background">
      <MetaHelmet
        title={t(`${i18nKey}.metaTitle`)}
        description={t(`${i18nKey}.metaDescription`)}
        path={loginPath}
        noindex
      />

      <div className="flex-1 lg:max-w-[480px] flex flex-col overflow-y-auto border-r border-border/40">
        <AuthPageHeader />

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-6">
          <div className="w-full max-w-[340px] mx-auto animate-slide-up">
            <div className="flex flex-col items-center text-center mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                atleita<span className="text-foreground">.</span>
              </p>
              <h1 className="text-2xl font-bold mb-2 leading-tight">
                {step === "email" ? (
                  <>
                    {t(`${i18nKey}.title`)}{" "}
                    <span className="text-primary">
                      {t(`${i18nKey}.titleHighlight`)}
                    </span>
                  </>
                ) : (
                  t(`${i18nKey}.titleCode`)
                )}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step === "email"
                  ? t(`${i18nKey}.subtitle`)
                  : t(`${i18nKey}.subtitleCode`, { email })}
              </p>
            </div>

            {step === "email" ? (
              <form onSubmit={emailForm.handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${role}-email`}
                    className="block text-sm font-medium text-foreground/90"
                  >
                    {t(`${i18nKey}.emailLabel`)}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id={`${role}-email`}
                      type="email"
                      {...emailForm.getFieldProps("email")}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-card/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      placeholder={t(`${i18nKey}.emailPlaceholder`)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailForm.submitCount > 0 && emailForm.errors.email ? (
                    <p className="text-xs text-destructive">
                      {emailForm.errors.email}
                    </p>
                  ) : null}
                </div>

                <AuthFormError error={error} />

                <button
                  type="submit"
                  disabled={requestingOtp}
                  className="w-full h-12 btn-primary rounded-xl flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60"
                >
                  {requestingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.sending")}
                    </>
                  ) : (
                    t("common.continue")
                  )}
                </button>

                {role === "organizer" ? (
                  <p className="text-center text-sm text-muted-foreground pt-1">
                    {t("auth.organizer.newPrompt")}{" "}
                    <Link
                      to="/organizers/signup"
                      className="font-semibold text-primary hover:underline"
                    >
                      {t("auth.organizer.newCta")}
                    </Link>
                  </p>
                ) : null}
              </form>
            ) : (
              <form onSubmit={codeForm.handleSubmit} className="space-y-5">
                <OtpInput
                  value={codeForm.values.code}
                  onChange={(v) => codeForm.setFieldValue("code", v)}
                  onComplete={(code) => {
                    if (verifyingOtp) return;
                    void codeForm.setFieldValue("code", code).then(() => {
                      void codeForm.submitForm();
                    });
                  }}
                  autoFocus
                  hasError={
                    !!(codeForm.submitCount > 0 && codeForm.errors.code)
                  }
                />
                {codeForm.submitCount > 0 && codeForm.errors.code ? (
                  <p className="text-xs text-destructive text-center">
                    {codeForm.errors.code}
                  </p>
                ) : null}
                <AuthFormError error={error} />
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="w-full h-12 btn-primary rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("common.verifying")}
                    </>
                  ) : (
                    t(`${i18nKey}.enterConsole`)
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    codeForm.resetForm();
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-primary py-1 inline-flex items-center justify-center gap-1 min-w-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{email}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 shrink-0">
          <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              {t(`${i18nKey}.trustSecure`)}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              {t(`${i18nKey}.trustInternal`)}
            </span>
          </div>
          <div className="flex items-center justify-center mb-3">
            <LanguageSwitcher variant="ghost" />
          </div>
          <p className="text-center text-[11px] text-muted-foreground/50">
            {t("common.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

      <AuthBrandPanel
        videoUrl={STAFF_LOGIN_VIDEO_URL}
        badge={t(`${i18nKey}.brandBadge`)}
        headline={
          <>
            {t(`${i18nKey}.brandHeadline`)}{" "}
            <span className="text-[hsl(var(--accent))]">
              {t(`${i18nKey}.brandHeadlineHighlight`)}
            </span>
          </>
        }
        subheadline={t(`${i18nKey}.brandSub`)}
        stats={stats}
        testimonials={testimonials}
        footerNote={t(`${i18nKey}.brandFooter`)}
      />
    </div>
  );
}
