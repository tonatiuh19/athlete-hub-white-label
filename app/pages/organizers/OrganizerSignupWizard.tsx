import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, ArrowUpRight } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import OtpInput from "@/components/OtpInput";
import GeoCitySelector from "@/components/geo/GeoCitySelector";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  patchOrganizerSignupForm,
  registerOrganizerSelfService,
  setOrganizerSignupStep,
  type OrganizerSignupStep,
} from "@/store/slices/organizerSignupSlice";
import { fetchGeoStates } from "@/store/slices/geoSlice";
import { fetchSportTypes } from "@/store/slices/marketplaceSlice";
import { requestStaffOtp, verifyStaffOtp } from "@/store/slices/staffAuthSlice";
import { isOrganizerCitySelectionValid } from "@/utils/geoCityValidation";
import LegalConsentNotice from "@/components/legal/LegalConsentNotice";
import { legalTermsAcceptanceSchema } from "@/validation/legalConsentSchema";
import type { OrganizerExpectedSizeBand } from "@shared/api";

const STEP_ORDER: OrganizerSignupStep[] = [
  "welcome",
  "owner",
  "organization",
  "intake",
  "verify",
];

function stepProgress(step: OrganizerSignupStep): number {
  const idx = STEP_ORDER.indexOf(step);
  if (idx <= 0) return 0;
  return Math.round((idx / (STEP_ORDER.length - 1)) * 100);
}

function stepNumber(step: OrganizerSignupStep): number {
  const idx = STEP_ORDER.indexOf(step);
  return idx <= 0 ? 0 : idx;
}

export default function OrganizerSignupWizard() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const skipWelcome = searchParams.get("step") === "owner";
  const { step, form, registering, registerError } = useAppSelector((s) => s.organizerSignup);
  const { sportTypes } = useAppSelector((s) => s.marketplace);
  const { requestingOtp, verifyingOtp, error: otpError, otpSentTo } = useAppSelector(
    (s) => s.staffAuth,
  );
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    dispatch(fetchGeoStates("MX"));
    dispatch(fetchSportTypes());
  }, [dispatch]);

  useEffect(() => {
    if (skipWelcome && step === "welcome") {
      dispatch(setOrganizerSignupStep("owner"));
    }
  }, [skipWelcome, step, dispatch]);

  useEffect(() => {
    if (step === "verify" && !otpRequested) {
      setOtpRequested(true);
      void dispatch(requestStaffOtp({ email: form.ownerEmail.trim().toLowerCase() }));
    }
  }, [step, otpRequested, dispatch, form.ownerEmail]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case "owner":
        return t("organizerSignup.steps.ownerTitle");
      case "organization":
        return t("organizerSignup.steps.organizationTitle");
      case "intake":
        return t("organizerSignup.steps.intakeTitle");
      case "verify":
        return t("organizerSignup.steps.verifyTitle");
      default:
        return "";
    }
  }, [step, t]);

  const ownerForm = useFormik({
    initialValues: {
      ownerFirstName: form.ownerFirstName,
      ownerLastName: form.ownerLastName,
      ownerEmail: form.ownerEmail,
      ownerPhone: form.ownerPhone,
    },
    enableReinitialize: true,
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      ownerFirstName: Yup.string().trim().required(t("common.required")),
      ownerLastName: Yup.string().trim().required(t("common.required")),
      ownerEmail: Yup.string()
        .email(t("common.invalidEmail"))
        .required(t("common.required")),
      ownerPhone: Yup.string(),
    }),
    onSubmit: (values) => {
      dispatch(patchOrganizerSignupForm(values));
      dispatch(setOrganizerSignupStep("organization"));
    },
  });

  const orgForm = useFormik({
    initialValues: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      city: form.city,
    },
    // Do NOT enableReinitialize: GeoCitySelector patches Redux mid-step; reinitting
    // would wipe in-progress name/email/phone that are not yet in the store.
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      name: Yup.string().trim().required(t("common.required")),
      email: Yup.string().email(t("common.invalidEmail")),
      phone: Yup.string(),
      city: Yup.string().trim().required(t("common.required")),
    }),
    onSubmit: (values) => {
      if (!isOrganizerCitySelectionValid(form.geoCityId, values.city)) {
        orgForm.setFieldError("city", t("organizerSignup.errors.invalidCity"));
        return;
      }
      dispatch(
        patchOrganizerSignupForm({
          ...values,
          email: values.email.trim() || form.ownerEmail.trim(),
        }),
      );
      dispatch(setOrganizerSignupStep("intake"));
    },
  });

  const intakeForm = useFormik({
    initialValues: {
      eventName: form.eventName,
      sportTypeId: form.sportTypeId != null ? String(form.sportTypeId) : "",
      roughDate: form.roughDate,
      expectedSize: form.expectedSize,
      acceptedTerms: true,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      eventName: Yup.string()
        .trim()
        .max(200, t("organizerSignup.errors.eventNameTooLong")),
      acceptedTerms: legalTermsAcceptanceSchema(t),
    }),
    onSubmit: async (values) => {
      dispatch(
        patchOrganizerSignupForm({
          eventName: values.eventName.trim(),
          sportTypeId: values.sportTypeId ? Number(values.sportTypeId) : null,
          roughDate: values.roughDate,
          expectedSize: values.expectedSize as OrganizerExpectedSizeBand | "",
        }),
      );
      const result = await dispatch(
        registerOrganizerSelfService({ locale: i18n.language }),
      );
      if (registerOrganizerSelfService.rejected.match(result)) {
        return;
      }
    },
  });

  const otpForm = useFormik({
    initialValues: { code: "" },
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      code: Yup.string()
        .matches(/^\d{6}$/, t("common.sixDigits"))
        .required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const email = (otpSentTo || form.ownerEmail).trim().toLowerCase();
      const result = await dispatch(verifyStaffOtp({ email, code: values.code }));
      if (verifyStaffOtp.fulfilled.match(result)) {
        navigate("/staff/onboarding", { replace: true });
      }
    },
  });

  const sizeOptions: { value: OrganizerExpectedSizeBand; label: string }[] = [
    { value: "<100", label: t("organizerSignup.intake.sizeUnder100") },
    { value: "100-500", label: t("organizerSignup.intake.size100to500") },
    { value: "500+", label: t("organizerSignup.intake.size500Plus") },
  ];

  const progressPct = stepProgress(step);

  return (
    <div className="pace-wizard-sheet pace-wizard-sheet--fluid w-full max-w-full min-w-0 overflow-x-clip">
      <MetaHelmet
        title={t("organizerSignup.metaTitle")}
        description={t("organizerSignup.metaDescription")}
        path="/organizers/signup"
        noindex
      />

      {step !== "welcome" ? (
        <div aria-live="polite">
          <div
            className="pace-wizard-progress"
            style={{ ["--wizard-progress" as string]: `${progressPct}%` }}
          >
            <span />
          </div>
          <p className="pace-wizard-step-label">
            {t("organizerSignup.stepLabel", {
              current: stepNumber(step),
              total: STEP_ORDER.length - 1,
            })}
            <span> · {stepTitle}</span>
          </p>
        </div>
      ) : null}

      {step === "welcome" && (
        <div className="pace-wizard-form">
          <div className="pace-wizard-header">
            <h1 className="pace-wizard-title">{t("organizerSignup.welcome.title")}</h1>
            <p className="pace-wizard-hint">{t("organizerSignup.welcome.subtitle")}</p>
          </div>
          <div className="pace-wizard-actions">
            <span />
            <button
              type="button"
              className="pace-wizard-next"
              onClick={() => dispatch(setOrganizerSignupStep("owner"))}
            >
              {t("organizerSignup.welcome.cta")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <p className="pace-wizard-privacy">
            {t("organizerSignup.welcome.hasAccount")}{" "}
            <Link to="/organizers/login">{t("organizerSignup.start.signIn")}</Link>
          </p>
        </div>
      )}

      {step === "owner" && (
        <form onSubmit={ownerForm.handleSubmit} className="pace-wizard-form">
          <div className="pace-wizard-header">
            <h1 className="pace-wizard-title">{stepTitle}</h1>
            <p className="pace-wizard-hint">{t("organizerSignup.owner.hint")}</p>
          </div>
          <div className="pace-wizard-fields">
            <div className="pace-wizard-fields--2">
              <div className="pace-form-field">
                <label htmlFor="owner-first">{t("organizerSignup.owner.firstName")}</label>
                <Input
                  id="owner-first"
                  autoComplete="given-name"
                  {...ownerForm.getFieldProps("ownerFirstName")}
                />
                {ownerForm.submitCount > 0 && ownerForm.errors.ownerFirstName ? (
                  <p className="pace-wizard-error">{ownerForm.errors.ownerFirstName}</p>
                ) : null}
              </div>
              <div className="pace-form-field">
                <label htmlFor="owner-last">{t("organizerSignup.owner.lastName")}</label>
                <Input
                  id="owner-last"
                  autoComplete="family-name"
                  {...ownerForm.getFieldProps("ownerLastName")}
                />
                {ownerForm.submitCount > 0 && ownerForm.errors.ownerLastName ? (
                  <p className="pace-wizard-error">{ownerForm.errors.ownerLastName}</p>
                ) : null}
              </div>
            </div>
            <div className="pace-form-field">
              <label htmlFor="owner-email">{t("organizerSignup.owner.email")}</label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#758176]"
                  aria-hidden
                />
                <Input
                  id="owner-email"
                  type="email"
                  autoComplete="email"
                  {...ownerForm.getFieldProps("ownerEmail")}
                />
              </div>
              {ownerForm.submitCount > 0 && ownerForm.errors.ownerEmail ? (
                <p className="pace-wizard-error">{ownerForm.errors.ownerEmail}</p>
              ) : null}
            </div>
            <div className="pace-form-field">
              <label htmlFor="owner-phone">{t("organizerSignup.owner.phoneOptional")}</label>
              <Input
                id="owner-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+52 …"
                {...ownerForm.getFieldProps("ownerPhone")}
              />
            </div>
          </div>
          <WizardNav
            onBack={() =>
              skipWelcome
                ? navigate("/organizers/start")
                : dispatch(setOrganizerSignupStep("welcome"))
            }
            submitLabel={t("common.continue")}
          />
        </form>
      )}

      {step === "organization" && (
        <form onSubmit={orgForm.handleSubmit} className="pace-wizard-form">
          <div className="pace-wizard-header">
            <h1 className="pace-wizard-title">{stepTitle}</h1>
            <p className="pace-wizard-hint">{t("organizerSignup.organization.hint")}</p>
          </div>
          <div className="pace-wizard-fields">
            <div className="pace-form-field">
              <label htmlFor="org-name">{t("organizerSignup.organization.name")}</label>
              <Input id="org-name" {...orgForm.getFieldProps("name")} />
              {orgForm.submitCount > 0 && orgForm.errors.name ? (
                <p className="pace-wizard-error">{orgForm.errors.name}</p>
              ) : null}
            </div>
            <div className="pace-form-field">
              <GeoCitySelector
                stateId={form.geoStateId}
                cityId={form.geoCityId}
                cityName={form.city}
                onChange={(sel) => {
                  dispatch(
                    patchOrganizerSignupForm({
                      geoStateId: sel.stateId,
                      geoCityId: sel.geoCityId,
                      city: sel.city,
                      name: orgForm.values.name,
                      email: orgForm.values.email,
                      phone: orgForm.values.phone,
                    }),
                  );
                  orgForm.setFieldValue("city", sel.city);
                }}
                staffRole="organizer"
              />
              {orgForm.submitCount > 0 && orgForm.errors.city ? (
                <p className="pace-wizard-error">{orgForm.errors.city}</p>
              ) : null}
            </div>
            <div className="pace-form-field">
              <label htmlFor="org-email">{t("organizerSignup.organization.emailOptional")}</label>
              <Input
                id="org-email"
                type="email"
                placeholder={form.ownerEmail || t("organizerSignup.organization.emailPlaceholder")}
                {...orgForm.getFieldProps("email")}
              />
            </div>
            <div className="pace-form-field">
              <label htmlFor="org-phone">{t("organizerSignup.organization.phoneOptional")}</label>
              <Input id="org-phone" type="tel" {...orgForm.getFieldProps("phone")} />
            </div>
          </div>
          <WizardNav
            onBack={() => dispatch(setOrganizerSignupStep("owner"))}
            submitLabel={t("common.continue")}
          />
        </form>
      )}

      {step === "intake" && (
        <form onSubmit={intakeForm.handleSubmit} className="pace-wizard-form">
          <div className="pace-wizard-header">
            <h1 className="pace-wizard-title">{stepTitle}</h1>
            <p className="pace-wizard-hint">{t("organizerSignup.intake.hint")}</p>
          </div>
          <div className="pace-wizard-fields">
            <div className="pace-form-field">
              <label htmlFor="intake-event-name">
                {t("organizerSignup.intake.eventNameOptional")}
              </label>
              <Input
                id="intake-event-name"
                placeholder={t("organizerSignup.intake.eventNamePlaceholder")}
                maxLength={200}
                {...intakeForm.getFieldProps("eventName")}
              />
              {intakeForm.submitCount > 0 && intakeForm.errors.eventName ? (
                <p className="pace-wizard-error">{intakeForm.errors.eventName}</p>
              ) : null}
            </div>
            <div className="pace-form-field">
              <label htmlFor="intake-sport">{t("organizerSignup.intake.sport")}</label>
              <Select
                value={intakeForm.values.sportTypeId}
                onValueChange={(v) => intakeForm.setFieldValue("sportTypeId", v)}
              >
                <SelectTrigger id="intake-sport">
                  <SelectValue placeholder={t("organizerSignup.intake.sportPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pace-form-field">
              <label htmlFor="rough-date">{t("organizerSignup.intake.dateOptional")}</label>
              <Input id="rough-date" type="month" {...intakeForm.getFieldProps("roughDate")} />
            </div>
            <fieldset className="pace-event-type-fieldset">
              <legend>{t("organizerSignup.intake.sizeOptional")}</legend>
              <div className="pace-event-type-grid">
                {sizeOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`pace-event-type${
                      intakeForm.values.expectedSize === opt.value ? " is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="expectedSize"
                      value={opt.value}
                      checked={intakeForm.values.expectedSize === opt.value}
                      onChange={() => intakeForm.setFieldValue("expectedSize", opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {registerError ? (
              <p className="pace-wizard-error" role="alert">
                {registerError}
              </p>
            ) : null}
            <LegalConsentNotice
              variant="organizerRegister"
              showCheckbox
              id="organizer-signup-legal"
              checked={intakeForm.values.acceptedTerms}
              onCheckedChange={(v) => intakeForm.setFieldValue("acceptedTerms", v)}
              error={
                intakeForm.submitCount > 0 && intakeForm.errors.acceptedTerms
                  ? String(intakeForm.errors.acceptedTerms)
                  : null
              }
            />
          </div>
          <WizardNav
            onBack={() => dispatch(setOrganizerSignupStep("organization"))}
            submitLabel={t("organizerSignup.intake.submit")}
            loading={registering}
          />
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={otpForm.handleSubmit} className="pace-wizard-form">
          <div className="pace-wizard-header">
            <h1 className="pace-wizard-title">{stepTitle}</h1>
            <p className="pace-wizard-hint">
              {t("organizerSignup.verify.subtitle", {
                email: otpSentTo || form.ownerEmail,
              })}
            </p>
          </div>
          <div className="pace-wizard-fields">
            <OtpInput
              variant="pace"
              value={otpForm.values.code}
              onChange={(code) => otpForm.setFieldValue("code", code)}
              onComplete={(code) => {
                if (verifyingOtp) return;
                void otpForm.setFieldValue("code", code).then(() => {
                  void otpForm.submitForm();
                });
              }}
            />
            {otpForm.submitCount > 0 && otpForm.errors.code ? (
              <p className="pace-wizard-error">{otpForm.errors.code}</p>
            ) : null}
            {otpError || registerError ? (
              <p className="pace-wizard-error" role="alert">
                {otpError || registerError}
              </p>
            ) : null}
          </div>
          <div className="pace-wizard-actions">
            <button
              type="button"
              className="pace-wizard-back"
              disabled={requestingOtp}
              onClick={() =>
                void dispatch(
                  requestStaffOtp({
                    email: (otpSentTo || form.ownerEmail).trim().toLowerCase(),
                  }),
                )
              }
            >
              {requestingOtp
                ? t("organizerSignup.verify.resending")
                : t("organizerSignup.verify.resend")}
            </button>
            <button type="submit" className="pace-wizard-next" disabled={verifyingOtp}>
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t("organizerSignup.verify.verifying")}
                </>
              ) : (
                <>
                  {t("organizerSignup.verify.submit")}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <p className="pace-wizard-privacy">
        {t("organizerSignup.helpPrompt")}{" "}
        <a href={`mailto:${t("organizerSignup.helpEmail")}`}>{t("organizerSignup.helpEmail")}</a>
      </p>
    </div>
  );
}

function WizardNav({
  onBack,
  submitLabel,
  loading = false,
}: {
  onBack: () => void;
  submitLabel: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="pace-wizard-actions">
      <button type="button" className="pace-wizard-back" onClick={onBack}>
        {t("organizerSignup.back")}
      </button>
      <button type="submit" className="pace-wizard-next" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t("common.loading")}
          </>
        ) : (
          <>
            {submitLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </>
        )}
      </button>
    </div>
  );
}
