import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCountdown from "@/components/events/EventCountdown";
import { cn } from "@/lib/utils";

interface EventRegisterSidebarProps {
  startDate: string;
  minPriceLabel: string;
  fromLabelVisible: boolean;
  spotsHint?: string | null;
  canRegister: boolean;
  canGroupRegister: boolean;
  isRegistered: boolean;
  registrationLabel: string;
  registerDisabled?: boolean;
  registerDisabledTitle?: string;
  onRegister: () => void;
  onGroupRegister?: () => void;
  myRegistrationPath?: string;
  className?: string;
  /** Sticky desktop card vs mobile bottom sheet strip */
  layout?: "card" | "mobileBar";
  /** Pin mobile bar inside a preview frame instead of the viewport (staff preview). */
  contained?: boolean;
  pendingPayment?: boolean;
  onResumePayment?: () => void;
}

export default function EventRegisterSidebar({
  startDate,
  minPriceLabel,
  fromLabelVisible,
  spotsHint,
  canRegister,
  canGroupRegister,
  isRegistered,
  registrationLabel,
  registerDisabled,
  registerDisabledTitle,
  onRegister,
  onGroupRegister,
  myRegistrationPath = "/portal/registrations",
  className,
  layout = "card",
  contained = false,
  pendingPayment,
  onResumePayment,
}: EventRegisterSidebarProps) {
  const { t } = useTranslation();

  if (layout === "mobileBar") {
    return (
      <div
        className={cn(
          contained
            ? "relative w-full shrink-0 border-t border-border bg-background/95 backdrop-blur-xl pb-3 pt-3 px-4"
            : "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-4",
          className,
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center gap-3",
            contained ? "w-full max-w-full" : "max-w-lg",
          )}
        >
          <div className="min-w-0 flex-1">
            {isRegistered ? (
              <p className="text-sm font-semibold text-success truncate">
                {t("eventDetail.registered")}
              </p>
            ) : (
              <>
                {fromLabelVisible ? (
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    {t("eventDetail.from")}
                  </p>
                ) : null}
                <p
                  className={cn(
                    fromLabelVisible
                      ? "text-base font-bold text-primary truncate"
                      : "text-xs font-medium text-primary leading-snug line-clamp-2",
                  )}
                >
                  {minPriceLabel}
                </p>
              </>
            )}
          </div>
          {isRegistered ? (
            <Button asChild size="sm" className="shrink-0 btn-primary font-bold">
              <Link to={myRegistrationPath}>{t("eventDetail.viewMyRegistration")}</Link>
            </Button>
          ) : pendingPayment && onResumePayment ? (
            <Button
              type="button"
              size="sm"
              onClick={onResumePayment}
              className="shrink-0 font-bold bg-primary text-primary-foreground"
            >
              {t("eventDetail.completePayment")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={registerDisabled}
              title={registerDisabledTitle}
              onClick={onRegister}
              className="shrink-0 btn-primary font-bold px-5"
            >
              {registrationLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "rounded-2xl border border-border bg-card shadow-lg overflow-hidden",
        className,
      )}
    >
      <EventCountdown targetIso={startDate} className="rounded-none border-0 border-b border-primary/15" />

      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {t("eventDetail.getTickets")}
          </h2>
          {spotsHint ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlarmClock className="h-3.5 w-3.5 text-primary shrink-0" />
              {spotsHint}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border pt-4">
          {isRegistered ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t("eventDetail.alreadyRegisteredTitle")}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full btn-primary font-bold">
                <Link to={myRegistrationPath}>{t("eventDetail.viewMyRegistration")}</Link>
              </Button>
              {canGroupRegister && onGroupRegister ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onGroupRegister}
                >
                  {t("eventDetail.registerGroupCta")}
                </Button>
              ) : null}
            </div>
          ) : pendingPayment && onResumePayment ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {t("eventDetail.pendingPaymentTitle")}
              </p>
              <Button
                type="button"
                onClick={onResumePayment}
                className="w-full btn-primary font-bold"
              >
                {t("eventDetail.completePayment")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("eventDetail.generalAdmission")}
                </p>
                {fromLabelVisible ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t("eventDetail.from")}
                  </p>
                ) : null}
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {minPriceLabel}
                </p>
              </div>
              <Button
                type="button"
                disabled={registerDisabled}
                title={registerDisabledTitle}
                onClick={onRegister}
                className="w-full h-12 text-base btn-primary font-bold shadow-md"
              >
                {registrationLabel}
              </Button>
              {canGroupRegister && onGroupRegister && canRegister ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onGroupRegister}
                >
                  {t("eventDetail.registerGroupCta")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
