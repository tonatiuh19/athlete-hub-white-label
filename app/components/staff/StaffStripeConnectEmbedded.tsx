import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/store/hooks";
import {
  createOrganizerAccountSession,
  syncOrganizerPayouts,
} from "@/store/slices/staffPortalSlice";
import { getStripeConnectLocale } from "@/utils/dateLocale";
import { logger } from "@/utils/logger";

type Props = {
  publishableKey?: string | null;
  payoutReady: boolean;
  /** Full wizard embeds vs payouts widget only (Pagos → Resumen). */
  variant?: "full" | "payoutsOnly";
  onFallbackToHostedLink?: () => void;
};

type ConnectAppearance = {
  overlays: "dialog";
  variables: {
    colorPrimary: string;
    colorBackground: string;
    colorText: string;
    colorDanger: string;
    borderRadius: string;
    fontFamily: string;
  };
};

/** Map Atleita CSS tokens → Connect embedded appearance (Stripe white-label theming). */
function readConnectAppearance(): ConnectAppearance {
  if (typeof document === "undefined") {
    return {
      overlays: "dialog",
      variables: {
        colorPrimary: "#214B3A",
        colorBackground: "#ffffff",
        colorText: "#18231F",
        colorDanger: "#dc2626",
        borderRadius: "12px",
        fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif",
      },
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const hsl = (token: string, fallback: string) => {
    const raw = styles.getPropertyValue(token).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return {
    overlays: "dialog",
    variables: {
      colorPrimary: hsl("--primary", "#214B3A"),
      colorBackground: hsl("--card", "#ffffff"),
      colorText: hsl("--foreground", "#18231F"),
      colorDanger: hsl("--destructive", "#dc2626"),
      borderRadius: "12px",
      fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif",
    },
  };
}

/**
 * In-app Connect embedded onboarding for marketplace recipients (white-label).
 * Connect.js calls fetchClientSecret for the initial session and refreshes.
 * Appearance tracks Atleita light theme tokens.
 */
export default function StaffStripeConnectEmbedded({
  publishableKey: publishableKeyProp,
  payoutReady,
  variant = "full",
  onFallbackToHostedLink,
}: Props) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seededSecretRef = useRef<string | null>(null);
  const connectLocale = useMemo(
    () => getStripeConnectLocale(i18n.language),
    [i18n.language],
  );

  const fetchClientSecret = useCallback(async () => {
    if (seededSecretRef.current) {
      const secret = seededSecretRef.current;
      seededSecretRef.current = null;
      return secret;
    }
    const result = await dispatch(createOrganizerAccountSession());
    if (createOrganizerAccountSession.fulfilled.match(result) && result.payload.clientSecret) {
      return result.payload.clientSecret;
    }
    throw new Error(
      createOrganizerAccountSession.rejected.match(result)
        ? result.payload || t("staffPortal.payouts.embedded.loadError")
        : t("staffPortal.payouts.embedded.loadError"),
    );
  }, [dispatch, t]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        let pk = publishableKeyProp?.trim() || "";
        if (!pk) {
          const seed = await dispatch(createOrganizerAccountSession());
          if (createOrganizerAccountSession.fulfilled.match(seed)) {
            pk = seed.payload.publishableKey?.trim() || "";
            if (seed.payload.clientSecret) {
              seededSecretRef.current = seed.payload.clientSecret;
            }
          }
        }
        if (!pk) {
          throw new Error(t("staffPortal.errors.stripePublishableKeyMissing"));
        }

        const instance = loadConnectAndInitialize({
          publishableKey: pk,
          fetchClientSecret,
          locale: connectLocale,
          appearance: readConnectAppearance(),
        });
        if (!cancelled) {
          setConnectInstance(instance);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("staff.connectEmbedded.initFailed", { message });
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [dispatch, fetchClientSecret, publishableKeyProp, t, connectLocale]);

  useEffect(() => {
    if (!connectInstance) return;
    connectInstance.update({ locale: connectLocale });
  }, [connectInstance, connectLocale]);

  // Atleita is light-only — set Connect appearance once from current tokens.
  useEffect(() => {
    if (!connectInstance) return;
    connectInstance.update({ appearance: readConnectAppearance() });
  }, [connectInstance]);

  const handleExit = useCallback(() => {
    void dispatch(syncOrganizerPayouts());
    toast({ title: t("staffPortal.payouts.embedded.syncedAfterExit") });
  }, [dispatch, t, toast]);

  if (loading) {
    return (
      <div className="card-sport p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">{t("staffPortal.payouts.embedded.loading")}</p>
      </div>
    );
  }

  if (error || !connectInstance) {
    return (
      <div className="card-sport p-5 space-y-3 border-destructive/30">
        <p className="text-sm text-destructive">
          {error || t("staffPortal.payouts.embedded.loadError")}
        </p>
        {onFallbackToHostedLink ? (
          <Button type="button" variant="outline" onClick={onFallbackToHostedLink}>
            {t("staffPortal.payouts.embedded.openHostedFallback")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (variant === "payoutsOnly") {
    return (
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <div className="rounded-xl border border-border overflow-hidden bg-card p-2 sm:p-3">
          <ConnectPayouts />
        </div>
      </ConnectComponentsProvider>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <div className="space-y-4">
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <ConnectNotificationBanner
            onNotificationsChange={() => {
              void dispatch(syncOrganizerPayouts());
            }}
          />
        </div>
        {!payoutReady ? (
          <div className="rounded-xl border border-border overflow-hidden bg-card p-2 sm:p-3">
            <p className="text-sm font-medium px-2 pt-2">
              {t("staffPortal.payouts.embedded.onboardingTitle")}
            </p>
            <p className="text-xs text-muted-foreground px-2 pb-2">
              {t("staffPortal.payouts.embedded.onboardingHint")}
            </p>
            <ConnectAccountOnboarding onExit={handleExit} />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border overflow-hidden bg-card p-2 sm:p-3">
              <p className="text-sm font-medium px-2 pt-2">
                {t("staffPortal.payouts.embedded.payoutsTitle")}
              </p>
              <ConnectPayouts />
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-card p-2 sm:p-3">
              <p className="text-sm font-medium px-2 pt-2">
                {t("staffPortal.payouts.embedded.accountTitle")}
              </p>
              <ConnectAccountManagement />
            </div>
          </>
        )}
      </div>
    </ConnectComponentsProvider>
  );
}
