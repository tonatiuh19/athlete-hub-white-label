import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Loader2, Mail, ShieldCheck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isClerkEnabled } from "@/lib/api";
import ClerkOAuthButtons from "@/components/ClerkOAuthButtons";
import AthleteOnboardingFields from "@/components/auth/AthleteOnboardingFields";
import OtpInput from "@/components/OtpInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  athleteDateOfBirthSchema,
  athleteGenderSchema,
} from "@/validation/athleteOnboardingSchema";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAthleteError,
  checkAthleteEmail,
  fetchAthleteMe,
  registerAthlete,
  requestAthleteOtp,
  verifyAthleteOtp,
} from "@/store/slices/athleteAuthSlice";
import { getAthleteToken } from "@/lib/api";
import AthleteProfileCompletionForm from "@/components/auth/AthleteProfileCompletionForm";
import { athleteNeedsProfileCompletion } from "@/utils/athleteProfileCompletion";
import LegalConsentNotice from "@/components/legal/LegalConsentNotice";
import { legalTermsAcceptanceSchema } from "@/validation/legalConsentSchema";

interface WizardAuthStepProps {
  onAuthed: () => void;
  /** Event path for Clerk SSO return (e.g. /events/slug). */
  returnTo?: string;
}

type AuthPhase = "identify" | "code" | "register" | "socialLogin";

export default function WizardAuthStep({ onAuthed, returnTo }: WizardAuthStepProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    user,
    token,
    checkingEmail,
    registering,
    requestingOtp,
    verifyingOtp,
    syncingClerk,
    error,
    otpSentTo,
  } = useAppSelector((s) => s.athleteAuth);
  const [phase, setPhase] = useState<AuthPhase>("identify");
  const [email, setEmail] = useState("");

  useEffect(() => {
    dispatch(clearAthleteError());
    if (getAthleteToken()) {
      dispatch(fetchAthleteMe())
        .unwrap()
        .then(() => {
          // advance handled when user state updates
        })
        .catch(() => undefined);
    }
  }, [dispatch]);

  useEffect(() => {
    if (user && token && !athleteNeedsProfileCompletion(user)) {
      onAuthed();
    }
  }, [user, token, onAuthed]);

  const identifyForm = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string().email(t("common.invalidEmail")).required(t("common.required")),
    }),
    onSubmit: async (values) => {
      const normalized = values.email.trim().toLowerCase();
      const check = await dispatch(checkAthleteEmail({ email: normalized }));
      if (checkAthleteEmail.rejected.match(check)) return;
      setEmail(normalized);
      const { exists, hasPassword, hasSocialLogin } = check.payload!;
      if (exists && hasSocialLogin && !hasPassword) {
        setPhase("socialLogin");
        return;
      }
      if (exists) {
        const otp = await dispatch(requestAthleteOtp({ email: normalized }));
        if (requestAthleteOtp.fulfilled.match(otp)) setPhase("code");
        return;
      }
      setPhase("register");
    },
  });

  const codeForm = useFormik({
    initialValues: { code: "" },
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
        dispatch(fetchAthleteMe());
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
          setPhase("code");
          return;
        }
        if ("token" in result.payload) {
          onAuthed();
        }
      }
    },
  });

  const perks = useMemo(
    () => [
      t("registrationWizard.auth.perk1"),
      t("registrationWizard.auth.perk2"),
      t("registrationWizard.auth.perk3"),
    ],
    [t],
  );

  if (user && token && athleteNeedsProfileCompletion(user)) {
    return (
      <AthleteProfileCompletionForm
        idPrefix="wizard-profile"
        compact
        onComplete={onAuthed}
      />
    );
  }

  if (user && token) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        {t("registrationWizard.auth.sessionReady")}
      </div>
    );
  }

  const busyIdentify = checkingEmail || requestingOtp;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("registrationWizard.auth.title")}
          </p>
          <p className="text-sm sm:text-xs text-muted-foreground mt-1">
            {phase === "register"
              ? t("registrationWizard.auth.registerSubtitlePasswordless")
              : phase === "code"
                ? t("registrationWizard.auth.otpSubtitle", {
                    email: otpSentTo || email,
                  })
                : t("registrationWizard.auth.subtitlePasswordless")}
          </p>
        </div>
      </div>

      <ul className="grid gap-2.5">
        {perks.map((perk) => (
          <li
            key={perk}
            className="text-sm sm:text-xs text-muted-foreground flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
            {perk}
          </li>
        ))}
      </ul>

      {phase === "identify" && (
        <form onSubmit={identifyForm.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wizard-email">{t("common.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="wizard-email"
                type="email"
                className="pl-10 h-11 placeholder:text-muted-foreground"
                autoComplete="email"
                autoFocus
                {...identifyForm.getFieldProps("email")}
                placeholder={t("auth.athlete.emailPlaceholder")}
              />
            </div>
            {identifyForm.touched.email && identifyForm.errors.email ? (
              <p className="text-xs text-destructive">{identifyForm.errors.email}</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full h-11" disabled={busyIdentify}>
            {busyIdentify ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("common.continue")
            )}
          </Button>
          {isClerkEnabled ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-background text-xs text-muted-foreground">
                    {t("registrationWizard.auth.orContinue")}
                  </span>
                </div>
              </div>
              <ClerkOAuthButtons
                returnTo={returnTo}
                disabled={!!syncingClerk}
              />
            </>
          ) : null}
        </form>
      )}

      {phase === "code" && (
        <form onSubmit={codeForm.handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground truncate">
            {otpSentTo || email}
          </div>
          <OtpInput
            value={codeForm.values.code}
            onChange={(code) => codeForm.setFieldValue("code", code)}
            onComplete={(code) => {
              if (verifyingOtp) return;
              void codeForm.setFieldValue("code", code).then(() => {
                void codeForm.submitForm();
              });
            }}
          />
          {codeForm.touched.code && codeForm.errors.code ? (
            <p className="text-xs text-destructive">{codeForm.errors.code}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full h-11" disabled={verifyingOtp}>
            {verifyingOtp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("auth.athlete.verifyContinue")
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={requestingOtp}
            onClick={() => {
              void dispatch(requestAthleteOtp({ email: otpSentTo || email }));
            }}
          >
            {requestingOtp
              ? t("auth.athlete.resendingCode")
              : t("auth.athlete.resendCode")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              dispatch(clearAthleteError());
              setPhase("identify");
            }}
          >
            {t("registrationWizard.auth.changeEmail")}
          </Button>
        </form>
      )}

      {phase === "register" && (
        <form onSubmit={registerForm.handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground truncate">
            {email}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-first-name">
              {t("registrationWizard.auth.firstNameLabel")}
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="wizard-first-name"
                className="pl-10 h-11"
                autoComplete="given-name"
                autoFocus
                {...registerForm.getFieldProps("firstName")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-last-name">
              {t("registrationWizard.auth.lastNameLabel")}
            </Label>
            <Input
              id="wizard-last-name"
              className="h-11"
              autoComplete="family-name"
              {...registerForm.getFieldProps("lastName")}
            />
          </div>
          <AthleteOnboardingFields
            idPrefix="wizard-register"
            dateOfBirth={registerForm.values.dateOfBirth}
            gender={registerForm.values.gender}
            onDateOfBirthChange={(v) => registerForm.setFieldValue("dateOfBirth", v)}
            onGenderChange={(v) => registerForm.setFieldValue("gender", v)}
            dateOfBirthError={
              registerForm.touched.dateOfBirth && registerForm.errors.dateOfBirth
                ? String(registerForm.errors.dateOfBirth)
                : undefined
            }
            genderError={
              registerForm.touched.gender && registerForm.errors.gender
                ? String(registerForm.errors.gender)
                : undefined
            }
          />
          <LegalConsentNotice
            variant="athleteRegister"
            showCheckbox
            id="wizard-register-legal"
            checked={registerForm.values.acceptedTerms}
            onCheckedChange={(v) => registerForm.setFieldValue("acceptedTerms", v)}
            error={
              registerForm.touched.acceptedTerms && registerForm.errors.acceptedTerms
                ? String(registerForm.errors.acceptedTerms)
                : null
            }
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full h-11" disabled={registering}>
            {registering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("auth.athlete.sendCodeContinue")
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              dispatch(clearAthleteError());
              setPhase("identify");
            }}
          >
            {t("registrationWizard.auth.changeEmail")}
          </Button>
        </form>
      )}

      {phase === "socialLogin" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground truncate">
            {email}
          </div>
          <LegalConsentNotice variant="athleteRegister" />
          <ClerkOAuthButtons
            returnTo={returnTo}
            disabled={!!syncingClerk}
          />
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              dispatch(clearAthleteError());
              setPhase("identify");
            }}
          >
            {t("registrationWizard.auth.changeEmail")}
          </Button>
        </div>
      )}
    </div>
  );
}
