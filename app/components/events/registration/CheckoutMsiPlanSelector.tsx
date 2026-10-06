import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatPriceMxn } from "@/utils/eventFormat";
import type { MsiPlanMonths } from "@shared/msi";
import { MSI_ALLOWED_PLAN_MONTHS } from "@shared/msi";

type PlanOption = MsiPlanMonths | null;

interface CheckoutMsiPlanSelectorProps {
  allowedPlans?: Array<3 | 6 | 9>;
  selectedPlan: PlanOption;
  monthlyPreviewCents?: Partial<Record<MsiPlanMonths, number>>;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (plan: PlanOption) => void;
}

export default function CheckoutMsiPlanSelector({
  allowedPlans = [...MSI_ALLOWED_PLAN_MONTHS],
  selectedPlan,
  monthlyPreviewCents,
  loading,
  disabled,
  onSelect,
}: CheckoutMsiPlanSelectorProps) {
  const { t, i18n } = useTranslation();
  const plans: PlanOption[] = [null, ...allowedPlans];

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("registrationWizard.msi.title")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("registrationWizard.msi.hint")}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {plans.map((plan) => {
          const active = selectedPlan === plan;
          const monthly =
            plan != null ? monthlyPreviewCents?.[plan] : undefined;
          return (
            <button
              key={plan == null ? "contado" : `msi-${plan}`}
              type="button"
              disabled={disabled || loading}
              onClick={() => onSelect(plan)}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-left transition-colors",
                "disabled:opacity-60 disabled:pointer-events-none",
                active
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border/70 bg-background hover:border-primary/40",
              )}
            >
              <span className="block text-xs font-semibold leading-tight">
                {plan == null
                  ? t("registrationWizard.msi.payInFull")
                  : t("registrationWizard.msi.months", { count: plan })}
              </span>
              {plan != null && monthly != null && monthly > 0 ? (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {t("registrationWizard.msi.perMonth", {
                    amount: formatPriceMxn(monthly, i18n.language),
                  })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
