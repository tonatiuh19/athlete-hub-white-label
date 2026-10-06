import {
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import StaffFeeCalculatorCard from "@/components/staff/StaffFeeCalculatorCard";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  adminDisableOrganizerConnect,
  adminEnableOrganizerConnect,
  adminLinkOrganizerConnectAccount,
  adminOnboardOrganizerConnect,
  adminRejectOrganizerPayoutAccount,
  adminRevealOrganizerPayoutClabe,
  adminSyncOrganizerConnect,
  adminUnverifyOrganizerPayoutAccount,
  adminVerifyOrganizerPayoutAccount,
  fetchAdminOrganizerConnect,
} from "@/store/slices/staffPortalSlice";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { OrganizerPayoutAccountPublic } from "@shared/api";

interface StaffAdminConnectPanelProps {
  organizerId: number;
}

export default function StaffAdminConnectPanel({ organizerId }: StaffAdminConnectPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const {
    adminOrganizerConnect,
    loadingAdminOrganizerConnect,
    adminOrganizerConnectError,
    adminConnectActionLoading,
  } = useAppSelector((s) => s.staffPortal);
  const [linkAccountId, setLinkAccountId] = useState("");
  const [rejectReasonById, setRejectReasonById] = useState<Record<number, string>>({});
  const [revealedClabeById, setRevealedClabeById] = useState<Record<number, string>>({});
  const revealTimersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    void dispatch(fetchAdminOrganizerConnect({ organizerId }));
  }, [dispatch, organizerId]);

  useEffect(() => {
    setRevealedClabeById({});
    setRejectReasonById({});
    for (const timer of Object.values(revealTimersRef.current)) {
      window.clearTimeout(timer);
    }
    revealTimersRef.current = {};
  }, [organizerId]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(revealTimersRef.current)) {
        window.clearTimeout(timer);
      }
      revealTimersRef.current = {};
    };
  }, []);

  const status = adminOrganizerConnect?.organizer.stripe_connect_status ?? "not_started";
  const feePercent = adminOrganizerConnect?.serviceFeePercent ?? 11;
  const feePresentation = adminOrganizerConnect?.feePresentation ?? "pass_through";
  const manualAccounts = adminOrganizerConnect?.manualAccounts ?? [];
  const manualReady = adminOrganizerConnect?.manualReady === true;

  const openOnboard = async () => {
    const result = await dispatch(adminOnboardOrganizerConnect({ organizerId }));
    if (!adminOnboardOrganizerConnect.fulfilled.match(result)) {
      toast({
        variant: "destructive",
        title: t("staffPortal.errors.startPayoutVerification"),
      });
      return;
    }
    if (result.payload.url) {
      window.open(result.payload.url, "_blank", "noopener,noreferrer");
      return;
    }
    toast({
      title: t("staffPortal.payouts.adminEmbeddedCreated"),
    });
    void dispatch(fetchAdminOrganizerConnect({ organizerId }));
  };

  const verifyAccount = async (account: OrganizerPayoutAccountPublic) => {
    const result = await dispatch(
      adminVerifyOrganizerPayoutAccount({ organizerId, id: account.id }),
    );
    if (adminVerifyOrganizerPayoutAccount.fulfilled.match(result)) {
      toast({ title: t("staffPortal.payoutAccounts.adminVerified") });
      void dispatch(fetchAdminOrganizerConnect({ organizerId }));
      return;
    }
    toast({
      variant: "destructive",
      title: result.payload || t("staffPortal.payoutAccounts.errors.verify"),
    });
  };

  const rejectAccount = async (account: OrganizerPayoutAccountPublic) => {
    const reason = rejectReasonById[account.id]?.trim();
    const result = await dispatch(
      adminRejectOrganizerPayoutAccount({
        organizerId,
        id: account.id,
        reason: reason || undefined,
      }),
    );
    if (adminRejectOrganizerPayoutAccount.fulfilled.match(result)) {
      toast({ title: t("staffPortal.payoutAccounts.adminRejected") });
      setRejectReasonById((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
      void dispatch(fetchAdminOrganizerConnect({ organizerId }));
      return;
    }
    toast({
      variant: "destructive",
      title: result.payload || t("staffPortal.payoutAccounts.errors.reject"),
    });
  };

  const unverifyAccount = async (account: OrganizerPayoutAccountPublic) => {
    const reason = rejectReasonById[account.id]?.trim();
    const result = await dispatch(
      adminUnverifyOrganizerPayoutAccount({
        organizerId,
        id: account.id,
        reason: reason || undefined,
      }),
    );
    if (adminUnverifyOrganizerPayoutAccount.fulfilled.match(result)) {
      toast({ title: t("staffPortal.payoutAccounts.adminUnverified") });
      setRejectReasonById((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
      void dispatch(fetchAdminOrganizerConnect({ organizerId }));
      return;
    }
    toast({
      variant: "destructive",
      title: result.payload || t("staffPortal.payoutAccounts.errors.unverify"),
    });
  };

  const revealClabe = async (account: OrganizerPayoutAccountPublic) => {
    const result = await dispatch(
      adminRevealOrganizerPayoutClabe({ organizerId, id: account.id }),
    );
    if (!adminRevealOrganizerPayoutClabe.fulfilled.match(result)) {
      toast({
        variant: "destructive",
        title: result.payload || t("staffPortal.payoutAccounts.errors.reveal"),
      });
      return;
    }
    const clabe = result.payload.clabe;
    setRevealedClabeById((prev) => ({ ...prev, [account.id]: clabe }));
    if (revealTimersRef.current[account.id]) {
      window.clearTimeout(revealTimersRef.current[account.id]);
    }
    revealTimersRef.current[account.id] = window.setTimeout(() => {
      setRevealedClabeById((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
      delete revealTimersRef.current[account.id];
    }, 60_000);
  };

  const copyClabe = async (clabe: string) => {
    try {
      await navigator.clipboard.writeText(clabe);
      toast({ title: t("staffPortal.payoutAccounts.clabeCopied") });
    } catch {
      toast({
        variant: "destructive",
        title: t("staffPortal.payoutAccounts.errors.copy"),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-sport p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold">{t("staffPortal.payouts.adminSectionTitle")}</h4>
          {loadingAdminOrganizerConnect ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        </div>
        <p className="text-xs text-muted-foreground">{t("staffPortal.payouts.adminSectionHint")}</p>

        {adminOrganizerConnectError ? (
          <p className="text-sm text-destructive">{adminOrganizerConnectError}</p>
        ) : null}

        {adminOrganizerConnect ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("staffPortal.finance.connectStatus")}</span>
              <StaffStatusBadge status={status} />
              {adminOrganizerConnect.payoutReady ? (
                <span className="text-accent text-xs">{t("staffPortal.payouts.statusReady")}</span>
              ) : null}
              {manualReady ? (
                <span className="text-accent text-xs">
                  {t("staffPortal.payoutAccounts.manualReadyBadge")}
                </span>
              ) : null}
            </div>

            {adminOrganizerConnect.organizer.stripe_account_id ? (
              <p className="text-xs font-mono text-muted-foreground break-all">
                {adminOrganizerConnect.organizer.stripe_account_id}
              </p>
            ) : null}

            <StaffFeeCalculatorCard
              serviceFeePercent={feePercent}
              feePresentation={feePresentation}
              compact
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openOnboard} disabled={adminConnectActionLoading}>
                <ExternalLink className="w-4 h-4 mr-1" />
                {t("staffPortal.payouts.adminStartOnboard")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch(adminSyncOrganizerConnect({ organizerId }))}
                disabled={adminConnectActionLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {t("staffPortal.payouts.syncStatus")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch(adminDisableOrganizerConnect({ organizerId }))}
                disabled={adminConnectActionLoading}
              >
                <ShieldOff className="w-4 h-4 mr-1" />
                {t("staffPortal.payouts.adminDisable")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch(adminEnableOrganizerConnect({ organizerId }))}
                disabled={adminConnectActionLoading}
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                {t("staffPortal.payouts.adminEnable")}
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="link_acct">{t("staffPortal.payouts.adminLinkAccount")}</Label>
              <div className="flex gap-2">
                <Input
                  id="link_acct"
                  className="min-w-0 flex-1"
                  placeholder={t("staffPortal.payouts.adminLinkAccountPlaceholder")}
                  value={linkAccountId}
                  onChange={(e) => setLinkAccountId(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!linkAccountId.trim().startsWith("acct_") || adminConnectActionLoading}
                  onClick={() =>
                    dispatch(
                      adminLinkOrganizerConnectAccount({
                        organizerId,
                        stripe_account_id: linkAccountId.trim(),
                      }),
                    )
                  }
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="card-sport p-4 space-y-3">
        <div>
          <h4 className="font-semibold">{t("staffPortal.payoutAccounts.adminSectionTitle")}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {t("staffPortal.payoutAccounts.adminSectionHint")}
          </p>
        </div>

        {manualAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("staffPortal.payoutAccounts.adminEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {manualAccounts.map((acc) => {
              const revealed = revealedClabeById[acc.id];
              const canReveal = acc.status === "submitted" || acc.status === "verified";
              return (
                <li
                  key={acc.id}
                  className="rounded-xl border border-border px-3 py-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
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
                        {acc.bank_name ? ` · ${acc.bank_name}` : ""}
                        {acc.rejection_reason ? ` — ${acc.rejection_reason}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {acc.holder_name} · {acc.legal_name}
                      </p>
                    </div>
                    {acc.status === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    ) : null}
                  </div>

                  {revealed ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                      <code className="text-xs font-mono tracking-wider">{revealed}</code>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => void copyClabe(revealed)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        {t("staffPortal.payoutAccounts.copyClabe")}
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {acc.status === "submitted" || acc.status === "rejected" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={adminConnectActionLoading}
                        onClick={() => void verifyAccount(acc)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {t("staffPortal.payoutAccounts.verifyCta")}
                      </Button>
                    ) : null}
                    {acc.status === "submitted" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={adminConnectActionLoading}
                        onClick={() => void rejectAccount(acc)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {t("staffPortal.payoutAccounts.rejectCta")}
                      </Button>
                    ) : null}
                    {acc.status === "verified" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={adminConnectActionLoading}
                        onClick={() => void unverifyAccount(acc)}
                      >
                        <ShieldOff className="w-3.5 h-3.5 mr-1" />
                        {t("staffPortal.payoutAccounts.unverifyCta")}
                      </Button>
                    ) : null}
                    {canReveal ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={adminConnectActionLoading}
                        onClick={() => void revealClabe(acc)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {t("staffPortal.payoutAccounts.revealClabeCta")}
                      </Button>
                    ) : null}
                  </div>

                  {acc.status === "submitted" || acc.status === "verified" ? (
                    <Input
                      className="h-8 text-xs"
                      placeholder={
                        acc.status === "verified"
                          ? t("staffPortal.payoutAccounts.unverifyReasonPlaceholder")
                          : t("staffPortal.payoutAccounts.rejectReasonPlaceholder")
                      }
                      value={rejectReasonById[acc.id] ?? ""}
                      onChange={(e) =>
                        setRejectReasonById((prev) => ({
                          ...prev,
                          [acc.id]: e.target.value,
                        }))
                      }
                    />
                  ) : null}

                  {(acc.constancia_url || acc.bank_statement_url) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {acc.constancia_url ? (
                        <a
                          href={acc.constancia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {t("staffPortal.payoutAccounts.constancia")}
                        </a>
                      ) : null}
                      {acc.bank_statement_url ? (
                        <a
                          href={acc.bank_statement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {t("staffPortal.payoutAccounts.bankStatement")}
                        </a>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
