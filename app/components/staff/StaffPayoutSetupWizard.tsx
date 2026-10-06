import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import WizardProgress from "@/components/events/registration/WizardProgress";
import StaffFeeCalculatorCard from "@/components/staff/StaffFeeCalculatorCard";
import StaffManualPayoutAccountForm from "@/components/staff/StaffManualPayoutAccountForm";
import StaffStripeConnectEmbedded from "@/components/staff/StaffStripeConnectEmbedded";
import { Button } from "@/components/ui/button";
import { ConsentCheck } from "@/components/ui/consent-check";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  acceptOrganizerPayoutTerms,
  loginOrganizerPayoutDashboard,
  onboardOrganizerPayouts,
  setOrganizerPayoutRail,
  syncOrganizerPayouts,
  updateOrganizerPayoutProfile,
} from "@/store/slices/staffPortalSlice";
import type { OrganizerPayoutStatusResponse, PayoutChecklistItem } from "@shared/api";
import { DEFAULT_SERVICE_FEE_PERCENT } from "@shared/checkoutBreakdown";

type WizardStep = "overview" | "terms" | "connect";
type PayoutRailChoice = "stripe" | "manual";

const STEPS: WizardStep[] = ["overview", "terms", "connect"];

function ChecklistSection({
  title,
  hint,
  items,
  itemKeyPrefix,
}: {
  title: string;
  hint: string;
  items: PayoutChecklistItem[];
  itemKeyPrefix: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="card-sport p-5 space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-sm">
            {item.complete ? (
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>
              {t(`${itemKeyPrefix}.${item.key}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StaffPayoutSetupWizard({
  payoutStatus,
}: {
  payoutStatus: OrganizerPayoutStatusResponse;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const {
    savingPayoutProfile,
    acceptingPayoutTerms,
    onboardingPayouts,
    payoutOnboardError,
    syncingPayouts,
  } = useAppSelector((s) => s.staffPortal);

  const org = payoutStatus.organizer;
  const stripeFee = payoutStatus.stripeServiceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT;
  const payoutReady = payoutStatus.payoutReady;
  const stripeReady = Boolean(payoutStatus.stripeReady);
  const manualReady = Boolean(payoutStatus.manualReady);
  const manualAccounts = payoutStatus.manualAccounts ?? [];
  const platformComplete = payoutStatus.platformChecklist.complete;
  const connectDashboard = payoutStatus.connectDashboard;
  const embeddedPreferred = payoutStatus.embeddedPreferred !== false;

  const initialStep: WizardStep = payoutReady
    ? "connect"
    : org.stripe_account_id ||
        org.payout_terms_accepted_at ||
        manualAccounts.length > 0
      ? "connect"
      : "overview";

  const [step, setStep] = useState<WizardStep>(initialStep);
  const [selectedRail, setSelectedRail] = useState<PayoutRailChoice>(() =>
    org.payout_rail === "manual" ? "manual" : "stripe",
  );
  const [legalName, setLegalName] = useState(org.legal_name ?? "");
  const [billingEmail, setBillingEmail] = useState(org.billing_email ?? org.email ?? "");
  const [samplePriceMxn, setSamplePriceMxn] = useState(1000);
  const [termsChecked, setTermsChecked] = useState(true);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [showEmbedded, setShowEmbedded] = useState(
    () =>
      Boolean(org.stripe_account_id) &&
      embeddedPreferred &&
      org.payout_rail !== "manual",
  );
  const [editingManualId, setEditingManualId] = useState<number | "new" | null>(null);

  useEffect(() => {
    setLegalName(org.legal_name ?? "");
    setBillingEmail(org.billing_email ?? org.email ?? "");
    if (org.payout_rail === "manual") {
      setSelectedRail("manual");
      setShowEmbedded(false);
    } else {
      setSelectedRail("stripe");
    }
    const preferEmbedded = payoutStatus.embeddedPreferred !== false;
    if (org.payout_rail === "manual") {
      setShowEmbedded(false);
    } else if (org.stripe_account_id && preferEmbedded) {
      setShowEmbedded(true);
    }
  }, [org, stripeReady, payoutStatus.embeddedPreferred]);

  const stepIndex = STEPS.indexOf(step);
  const progressSteps = useMemo(
    () =>
      STEPS.map((key) => ({
        key,
        label: t(`staffPortal.payouts.wizard.steps.${key}`),
      })),
    [t],
  );

  const feePresentation = payoutStatus.feePresentation ?? org.fee_presentation ?? "pass_through";
  const absorbAllFees = feePresentation === "absorb_all";
  const displayFee = stripeFee;
  const termsContactValid =
    legalName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail.trim());
  const termsStepValid = termsContactValid && termsChecked;
  const showStripeEmbedded =
    selectedRail === "stripe" && showEmbedded && platformComplete;
  const hasVerifiedDefaultManual = manualAccounts.some(
    (a) => a.status === "verified" && a.is_default,
  );
  const editableManual =
    editingManualId === "new"
      ? null
      : manualAccounts.find((a) => a.id === editingManualId) ??
        manualAccounts.find((a) => a.status === "draft" || a.status === "rejected") ??
        null;
  const showManualForm =
    selectedRail === "manual" &&
    platformComplete &&
    (editingManualId != null ||
      (!hasVerifiedDefaultManual &&
        (editableManual != null || manualAccounts.length === 0 || editingManualId === "new")));

  const goNext = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!);
  };
  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!);
  };

  const handleTermsContinue = async () => {
    const name = legalName.trim();
    const email = billingEmail.trim();
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        variant: "destructive",
        title: t("staffPortal.payouts.wizard.contactInvalid"),
      });
      return;
    }
    if (!termsChecked) {
      toast({
        variant: "destructive",
        title: t("staffPortal.payouts.wizard.termsRequired"),
      });
      return;
    }

    const profileResult = await dispatch(
      updateOrganizerPayoutProfile({
        legal_name: name,
        billing_email: email,
      }),
    );
    if (updateOrganizerPayoutProfile.rejected.match(profileResult)) {
      toast({
        variant: "destructive",
        title: profileResult.payload || t("staffPortal.errors.savePayoutProfile"),
      });
      return;
    }

    if (!org.payout_terms_accepted_at) {
      const termsResult = await dispatch(acceptOrganizerPayoutTerms());
      if (acceptOrganizerPayoutTerms.rejected.match(termsResult)) {
        toast({
          variant: "destructive",
          title: termsResult.payload || t("staffPortal.errors.acceptPayoutTerms"),
        });
        return;
      }
    }

    if (selectedRail !== org.payout_rail) {
      const railResult = await dispatch(setOrganizerPayoutRail(selectedRail));
      if (setOrganizerPayoutRail.rejected.match(railResult)) {
        toast({
          variant: "destructive",
          title: railResult.payload || t("staffPortal.errors.savePayoutRail"),
        });
        return;
      }
    }

    if (selectedRail === "stripe" && embeddedPreferred) {
      setShowEmbedded(true);
    }
    if (selectedRail === "manual") {
      setShowEmbedded(false);
      setEditingManualId("new");
    }
    goNext();
  };

  const handleFeePresentationToggle = async (checked: boolean) => {
    if (checked && !window.confirm(t("staffPortal.payouts.feePresentationSwitchConfirm"))) {
      return;
    }
    const next = checked ? "absorb_all" : "pass_through";
    const result = await dispatch(updateOrganizerPayoutProfile({ fee_presentation: next }));
    if (updateOrganizerPayoutProfile.fulfilled.match(result)) {
      toast({
        title: t(
          checked
            ? "staffPortal.payouts.feePresentationAbsorbEnabled"
            : "staffPortal.payouts.feePresentationPassThroughEnabled",
        ),
      });
    }
  };

  /** Hosted Account Link is preferred once embedded failed — avoid clientSecret retry loops. */
  const handleHostedFallback = async () => {
    const result = await dispatch(onboardOrganizerPayouts());
    if (onboardOrganizerPayouts.fulfilled.match(result) && result.payload.url) {
      window.location.href = result.payload.url;
      return;
    }
    if (onboardOrganizerPayouts.fulfilled.match(result) && result.payload.clientSecret) {
      setShowEmbedded(true);
      return;
    }
    toast({
      variant: "destructive",
      title: onboardOrganizerPayouts.rejected.match(result)
        ? result.payload || t("staffPortal.errors.startPayoutVerification")
        : t("staffPortal.errors.startPayoutVerification"),
    });
  };

  const handleExpressLogin = async () => {
    setOpeningDashboard(true);
    try {
      await dispatch(syncOrganizerPayouts());
      const result = await dispatch(loginOrganizerPayoutDashboard());
      if (loginOrganizerPayoutDashboard.fulfilled.match(result) && result.payload.url) {
        window.open(result.payload.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (loginOrganizerPayoutDashboard.rejected.match(result)) {
        const message = result.payload || t("staffPortal.errors.openPayoutDashboard");
        // Only fall back to hosted Account Link when Express login is intentionally blocked.
        if (result.payload === "dashboard_internal") {
          await handleHostedFallback();
          return;
        }
        toast({
          variant: "destructive",
          title: message,
        });
      }
    } finally {
      setOpeningDashboard(false);
    }
  };

  const startEmbedded = () => {
    if (!platformComplete) {
      toast({
        variant: "destructive",
        title: t("staffPortal.payouts.wizard.completeTermsFirst"),
      });
      setStep("terms");
      return;
    }
    void dispatch(setOrganizerPayoutRail("stripe"));
    setSelectedRail("stripe");
    if (embeddedPreferred) {
      setShowEmbedded(true);
    } else {
      void handleHostedFallback();
    }
  };

  return (
    <div className="space-y-6">
      <WizardProgress
        steps={progressSteps}
        currentIndex={Math.max(0, stepIndex)}
        stepOfLabel={t("staffPortal.payouts.wizard.stepOf", {
          current: stepIndex + 1,
          total: STEPS.length,
        })}
      />

      <div
        className={cn(
          "rounded-xl border px-4 py-3 flex items-start gap-3",
          payoutReady
            ? "border-accent/30 bg-accent/5"
            : "border-primary/25 bg-primary/5",
        )}
      >
        {payoutReady ? (
          <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        ) : (
          <Banknote className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-medium">
            {payoutReady
              ? t("staffPortal.payouts.statusReady")
              : t("staffPortal.payouts.statusNotReady")}
          </p>
          {!payoutReady ? (
            <p className="text-xs text-muted-foreground mt-1">
              {t("staffPortal.payouts.wizard.statusHintCompleteBelow")}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground mt-2">
            {t("staffPortal.payouts.wizard.autoTransferHint")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1.5 leading-relaxed">
            <ShieldCheck
              className={cn(
                "w-3.5 h-3.5 shrink-0 mt-0.5",
                payoutReady ? "text-accent" : "text-primary",
              )}
              aria-hidden
            />
            <span>{t("staffPortal.payouts.wizard.poweredByPartner")}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("staffPortal.payouts.wizard.supportIfIssues", {
              email: t("organizerSignup.helpEmail"),
            })}
          </p>
        </div>
      </div>

      {step === "overview" ? (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="card-sport p-5 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("staffPortal.payouts.wizard.overviewTitle")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("staffPortal.payouts.wizard.overviewIntro")}
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• {t("staffPortal.payouts.wizard.stripeBullet1")}</li>
              <li>• {t("staffPortal.payouts.wizard.stripeBullet2")}</li>
              <li>• {t("staffPortal.payouts.wizard.autoTransferBullet")}</li>
            </ul>
            <p className="text-3xl font-bold tabular-nums text-primary pt-2">
              {stripeFee}%
              <span className="text-sm font-medium text-muted-foreground ml-1">
                {t("staffPortal.payouts.wizard.platformFee")}
              </span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedRail("stripe")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  selectedRail === "stripe"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
              >
                <p className="font-semibold">{t("staffPortal.payouts.railStripe")}</p>
                <p className="text-2xl font-bold text-primary mt-2 tabular-nums">{stripeFee}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("staffPortal.payouts.wizard.stripeShort")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRail("manual")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  selectedRail === "manual"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
              >
                <p className="font-semibold">{t("staffPortal.payouts.railManual")}</p>
                <p className="text-2xl font-bold text-primary mt-2 tabular-nums">{stripeFee}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("staffPortal.payouts.wizard.manualShort")}
                </p>
              </button>
            </div>

          <div className="flex justify-end">
            <Button type="button" onClick={goNext} className="gap-2">
              {t("staffPortal.payouts.wizard.continue")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "terms" ? (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="card-sport p-5 space-y-4">
            <h2 className="font-semibold">{t("staffPortal.payouts.wizard.termsTitle")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payout-legal-name">{t("staffPortal.payouts.fieldLegalName")}</Label>
                <Input
                  id="payout-legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payout-billing-email">{t("staffPortal.payouts.fieldBillingEmail")}</Label>
                <Input
                  id="payout-billing-email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <ConsentCheck
              id="payout-terms-accept"
              checked={termsChecked}
              onCheckedChange={setTermsChecked}
            >
              {t("staffPortal.payouts.wizard.termsCheckbox", { fee: displayFee })}
            </ConsentCheck>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{t("staffPortal.payouts.feePresentationTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("staffPortal.payouts.feePresentationHint")}
                </p>
              </div>
              <Switch checked={absorbAllFees} onCheckedChange={handleFeePresentationToggle} />
            </div>

            <StaffFeeCalculatorCard
              feePresentation={feePresentation}
              serviceFeePercent={displayFee}
              samplePriceMxn={samplePriceMxn}
              samplePriceEditable
              onSamplePriceChange={setSamplePriceMxn}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={goBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("staffPortal.payouts.wizard.back")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleTermsContinue()}
              disabled={
                !termsStepValid || savingPayoutProfile || acceptingPayoutTerms
              }
              className="gap-2"
            >
              {savingPayoutProfile || acceptingPayoutTerms ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {t("staffPortal.payouts.wizard.continue")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "connect" ? (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="grid md:grid-cols-2 gap-4">
            <ChecklistSection
              title={t("staffPortal.payouts.wizard.platformChecklistTitle")}
              hint={t("staffPortal.payouts.wizard.platformChecklistHint")}
              items={payoutStatus.platformChecklist.items}
              itemKeyPrefix="staffPortal.payouts.platformItem"
            />
            {selectedRail === "manual" ? (
              <div className="card-sport p-5 space-y-3">
                <div>
                  <h2 className="font-semibold">{t("staffPortal.payouts.railManual")}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("staffPortal.payouts.wizard.manualChecklistHint")}
                  </p>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    {manualReady ? (
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span className={manualReady ? "text-foreground" : "text-muted-foreground"}>
                      {t("staffPortal.payoutAccounts.checklistVerifiedDefault")}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <ChecklistSection
                title={t("staffPortal.payouts.wizard.stripeChecklistTitle")}
                hint={t("staffPortal.payouts.wizard.stripeChecklistHint")}
                items={payoutStatus.stripeChecklist.items}
                itemKeyPrefix="staffPortal.payouts.bankVerificationItem"
              />
            )}
          </div>

          {payoutOnboardError ? (
            <p className="text-sm text-destructive">{payoutOnboardError}</p>
          ) : null}

          {selectedRail === "manual" ? (
            <div className="space-y-4">
              {manualAccounts.length > 0 ? (
                <div className="space-y-2">
                  {manualAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {acc.nickname} · ••••{acc.clabe_last4}
                          {acc.is_default ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">
                              {t("staffPortal.payoutAccounts.defaultBadge")}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(`staffPortal.payoutAccounts.status.${acc.status}`)}
                          {acc.rejection_reason
                            ? ` — ${acc.rejection_reason}`
                            : ""}
                        </p>
                      </div>
                      {(acc.status === "draft" || acc.status === "rejected") &&
                      !hasVerifiedDefaultManual ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingManualId(acc.id)}
                        >
                          {t("staffPortal.payoutAccounts.edit")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {!hasVerifiedDefaultManual && editingManualId == null ? (
                <Button
                  type="button"
                  onClick={() => setEditingManualId(editableManual?.id ?? "new")}
                  disabled={!platformComplete}
                >
                  {t("staffPortal.payoutAccounts.addAccount")}
                </Button>
              ) : null}

              {showManualForm || editingManualId != null ? (
                <StaffManualPayoutAccountForm
                  account={
                    editingManualId === "new"
                      ? null
                      : (manualAccounts.find((a) => a.id === editingManualId) ??
                        editableManual)
                  }
                  onSaved={() => {
                    setEditingManualId(null);
                    void dispatch(syncOrganizerPayouts());
                  }}
                />
              ) : null}

              {manualReady ? (
                <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{t("staffPortal.payoutAccounts.readyBanner")}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {connectDashboard === "express" && org.stripe_account_id && stripeReady ? (
            <div className="card-sport p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("staffPortal.payouts.wizard.expressLegacyHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleExpressLogin()}
                  disabled={openingDashboard}
                  className="gap-2"
                >
                  {openingDashboard ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {t("staffPortal.payouts.wizard.openExpressDashboard")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleHostedFallback()}
                  disabled={onboardingPayouts}
                >
                  {t("staffPortal.payouts.embedded.openHostedFallback")}
                </Button>
              </div>
            </div>
          ) : null}

          {showStripeEmbedded ? (
            <StaffStripeConnectEmbedded
              publishableKey={payoutStatus.stripePublishableKey}
              payoutReady={stripeReady}
              onFallbackToHostedLink={() => void handleHostedFallback()}
            />
          ) : selectedRail === "stripe" ? (
            <div className="card-sport p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("staffPortal.payouts.wizard.connectIntro")}
              </p>
              <Button
                type="button"
                onClick={startEmbedded}
                disabled={!platformComplete || onboardingPayouts}
                className="gap-2"
              >
                {onboardingPayouts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {t("staffPortal.payouts.wizard.startEmbedded")}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={goBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("staffPortal.payouts.wizard.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void dispatch(syncOrganizerPayouts())}
              disabled={syncingPayouts}
              className="gap-2"
            >
              {syncingPayouts ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t("staffPortal.payouts.syncStatus")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
