import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useClerk, useSignIn } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import {
  getClerkOAuthProviders,
  type ClerkOAuthProviderConfig,
  type ClerkOAuthProviderId,
  type ClerkOAuthStrategy,
} from "@/config/clerkOAuthProviders";
import { getAthleteToken, isClerkEnabled } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  persistGroupRegistrationBeforeOAuth,
  persistRegistrationBeforeOAuth,
  shouldSkipClerkSilentResume,
} from "@/utils/registrationSessionStorage";
import {
  clerkOAuthRoutingSnapshot,
  clerkOAuthStartParams,
} from "@/utils/clerkOAuthRouting";
import {
  clearClerkSessionAfterFailedResume,
  clerkResumeError,
  clerkResumePath,
  isClerkAlreadySignedInError,
  resumeClerkAthleteSession,
} from "@/utils/clerkAthleteSync";
import { logger } from "@/utils/logger";
import { stashSsoReturnTo } from "@/utils/ssoReturnStorage";
import { clearAthleteIntentionalLogout } from "@/utils/athleteSessionLogout";
import { markSsoOAuthStarted, ssoTrace, installSsoNavigationProbe } from "@/utils/ssoTrace";
import { useTranslation } from "react-i18next";
import ClerkLoadedGate from "@/components/auth/ClerkLoadedGate";

interface ClerkOAuthButtonsProps {
  onSuccess?: () => void;
  disabled?: boolean;
  /** After SSO, return here instead of /portal (athlete registration wizard). */
  returnTo?: string;
}

function OAuthButtonGrid({
  providers,
  loading,
  disabled,
  onSelect,
}: {
  providers: ClerkOAuthProviderConfig[];
  loading: ClerkOAuthProviderId | null;
  disabled?: boolean;
  onSelect: (provider: ClerkOAuthProviderConfig) => void;
}) {
  const gridClass =
    providers.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2";

  return (
    <div className={gridClass}>
      {providers.map((provider) => {
        const Icon = provider.Icon;
        return (
          <button
            key={provider.id}
            type="button"
            disabled={!!loading || disabled}
            onClick={() => onSelect(provider)}
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card hover:border-cyan/40 hover:bg-cyan/5 text-sm font-medium transition-all"
          >
            {loading === provider.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            {provider.label}
          </button>
        );
      })}
    </div>
  );
}

function ClerkOAuthButtonsDisabled() {
  const { t } = useTranslation();
  const providers = getClerkOAuthProviders();

  return (
    <div className="space-y-2">
      <p className="text-xs text-center text-muted-foreground">
        {t("common.clerkDisabled")}
      </p>
      <div className="opacity-40 pointer-events-none">
        <OAuthButtonGrid
          providers={providers}
          loading={null}
          onSelect={() => undefined}
        />
      </div>
    </div>
  );
}

function ClerkOAuthButtonsInner({
  onSuccess,
  disabled,
  returnTo,
}: ClerkOAuthButtonsProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded, signIn } = useSignIn();
  const [loading, setLoading] = useState<ClerkOAuthProviderId | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const providers = getClerkOAuthProviders();
  const {
    open: registrationOpen,
    eventSlug: registrationEventSlug,
    category: registrationCategory,
    step: registrationStep,
  } = useAppSelector((s) => s.registrationCheckout);
  const {
    open: groupRegistrationOpen,
    eventSlug: groupEventSlug,
    simulationToken: groupSimulationToken,
  } = useAppSelector((s) => s.groupRegistration);

  if (!isLoaded || providers.length === 0) return null;

  // Atleita JWT is the source of truth — Clerk session alone is not enough.
  if (getAthleteToken()) return null;

  const tryResumeExistingClerkSession = async (
    resolvedReturnTo: string,
  ): Promise<boolean> => {
    if (!authLoaded || !isSignedIn || getAthleteToken()) return false;
    const resumed = await resumeClerkAthleteSession({
      dispatch,
      getToken,
      returnTo: resolvedReturnTo,
    });
    if (!resumed.ok) {
      const message = clerkResumeError(resumed) ?? "sync_failed";
      setResumeError(message);
      await clearClerkSessionAfterFailedResume(clerk, message);
      return false;
    }
    const path = clerkResumePath(resumed);
    if (!path) return false;
    navigate(path, { replace: true });
    // Event registration resume reopens via RegistrationPaymentReturnHandler — skip onSuccess.
    if (!path.startsWith("/events/")) {
      onSuccess?.();
    }
    return true;
  };

  const handleOAuth = async (
    provider: ClerkOAuthProviderConfig,
    strategy: ClerkOAuthStrategy,
  ) => {
    if (!signIn || disabled || loading) return;
    setLoading(provider.id);
    setResumeError(null);
    const startParams = clerkOAuthStartParams();
    const skipSilentResume = shouldSkipClerkSilentResume({
      registrationOpen,
      groupRegistrationOpen,
      eventSlug: registrationEventSlug ?? groupEventSlug,
      categoryId: registrationCategory?.id,
    });
    try {
      const resolvedReturnTo =
        returnTo ?? `${window.location.pathname}${window.location.search}`;
      if (registrationOpen && registrationEventSlug && registrationCategory?.id != null) {
        persistRegistrationBeforeOAuth({
          eventSlug: registrationEventSlug,
          categoryId: registrationCategory.id,
          step: registrationStep === "result" ? "auth" : registrationStep,
        });
      } else if (groupRegistrationOpen && groupEventSlug) {
        persistGroupRegistrationBeforeOAuth({
          eventSlug: groupEventSlug,
          simulationToken: groupSimulationToken,
        });
      }
      stashSsoReturnTo(resolvedReturnTo);
      clearAthleteIntentionalLogout();
      markSsoOAuthStarted();
      installSsoNavigationProbe();

      const oauthRouting = clerkOAuthRoutingSnapshot();
      ssoTrace("oauth:start", {
        provider: provider.id,
        strategy,
        ...oauthRouting,
        returnTo: resolvedReturnTo,
        registrationOpen,
        groupRegistrationOpen,
        skipSilentResume,
      });

      // Registration wizard: never silent-resume. Syncing a Atleita JWT here advances
      // the wizard (auth → next step) before Google redirect, which flashes the next form.
      if (!skipSilentResume && (await tryResumeExistingClerkSession(resolvedReturnTo))) {
        return;
      }

      await signIn.authenticateWithRedirect({
        strategy,
        ...startParams,
      });
      // Do not call onSuccess — full-page redirect; RegistrationPaymentReturnHandler reopens the wizard.
    } catch (err) {
      if (isClerkAlreadySignedInError(err)) {
        ssoTrace("oauth:already-signed-in-resume", {
          provider: provider.id,
          skipSilentResume,
        });
        const resolvedReturnTo =
          returnTo ?? `${window.location.pathname}${window.location.search}`;
        await clearClerkSessionAfterFailedResume(
          clerk,
          skipSilentResume ? "already_signed_in_registration" : "already_signed_in",
        );
        // Registration: force Google redirect — do not sync Atleita JWT mid-flow.
        if (!skipSilentResume && (await tryResumeExistingClerkSession(resolvedReturnTo))) {
          return;
        }
        try {
          await signIn.authenticateWithRedirect({
            strategy,
            ...startParams,
          });
          return;
        } catch (retryErr) {
          ssoTrace("oauth:retry-after-signout:error", {
            provider: provider.id,
            error: String(retryErr),
          });
        }
      }
      ssoTrace("oauth:error", { provider: provider.id, strategy, error: String(err) });
      logger.error("Clerk OAuth error", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      {resumeError ? (
        <p className="text-xs text-center text-destructive">
          {t("auth.sso.resumeFailed")}
        </p>
      ) : null}
      <OAuthButtonGrid
        providers={providers}
        loading={loading}
        disabled={disabled}
        onSelect={(provider) => void handleOAuth(provider, provider.strategy)}
      />
    </div>
  );
}

export default function ClerkOAuthButtons(props: ClerkOAuthButtonsProps) {
  if (!isClerkEnabled) return <ClerkOAuthButtonsDisabled />;
  return (
    <ClerkLoadedGate fallback={<ClerkOAuthButtonsDisabled />}>
      <ClerkOAuthButtonsInner {...props} />
    </ClerkLoadedGate>
  );
}
