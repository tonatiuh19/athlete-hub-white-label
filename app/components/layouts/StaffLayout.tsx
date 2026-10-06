import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Building2,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StaffPortalProvider } from "@/components/staff/StaffPortalContext";
import { StaffPageSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  staffLogout,
  fetchStaffMe,
  updateStaffLanguage,
  restoreStaffRoleFromToken,
} from "@/store/slices/staffAuthSlice";
import { fetchOrganizerSite } from "@/store/slices/organizerSiteSlice";
import { fetchOrganizerPayoutStatus } from "@/store/slices/staffPortalSlice";
import { canAccessStaffPayouts, getStaffNav } from "@/utils/staffNav";
import {
  buildOrganizerNavAttention,
  staffNavAttentionLabelKey,
} from "@/utils/staffNavAttention";
import { isStaffEventConsolePath } from "@/utils/eventConsoleNav";
import { decodeStaffRoleFromToken } from "@/utils/staffSession";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@shared/i18n";
import { Button } from "@/components/ui/button";

function StaffPageFallback() {
  return <StaffPageSkeleton variant="default" className="py-4" />;
}

export default function StaffLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { token, user, role, hydrateError, loading } = useAppSelector((s) => s.staffAuth);
  const organizerSite = useAppSelector((s) => s.organizerSite.site);
  const siteLoading = useAppSelector((s) => s.organizerSite.loading);
  const payoutStatus = useAppSelector((s) => s.staffPortal.payoutStatus);
  const loadingPayoutStatus = useAppSelector((s) => s.staffPortal.loadingPayoutStatus);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  /** Inside an event: org sidebar collapses; event console sidebar is primary. */
  const eventConsoleMode = isStaffEventConsolePath(location.pathname);
  /** Site editor needs full content width for live microsite preview. */
  const siteEditorMode =
    location.pathname === "/staff/site" ||
    location.pathname.startsWith("/staff/site/");
  const fullBleedMain = eventConsoleMode || siteEditorMode;

  useEffect(() => {
    if (!token) return;

    if (!role) {
      const recoverable = decodeStaffRoleFromToken(token);
      if (recoverable) {
        dispatch(restoreStaffRoleFromToken());
        return;
      }
      // Unusable token (no actor) — clear without leaving a hung spinner.
      void dispatch(staffLogout());
      return;
    }

    if (!user && !hydrateError) void dispatch(fetchStaffMe(role));
  }, [token, role, user, hydrateError, dispatch]);

  const organizerRole = user?.type === "organizer" ? user.role : undefined;
  const isOrganizer = role === "organizer";

  useEffect(() => {
    if (!isOrganizer || !user) return;
    if (!organizerSite && !siteLoading) {
      void dispatch(fetchOrganizerSite());
    }
    if (
      canAccessStaffPayouts(false, organizerRole) &&
      !payoutStatus &&
      !loadingPayoutStatus
    ) {
      void dispatch(fetchOrganizerPayoutStatus());
    }
  }, [
    dispatch,
    isOrganizer,
    user,
    organizerSite,
    siteLoading,
    organizerRole,
    payoutStatus,
    loadingPayoutStatus,
  ]);

  const navAttention = useMemo(() => {
    if (!isOrganizer) return {};
    return buildOrganizerNavAttention({
      organizerRole,
      siteLoaded: Boolean(organizerSite),
      siteStatus: organizerSite?.status,
      siteLegal: organizerSite?.legal ?? null,
      payoutsLoaded: payoutStatus != null,
      payoutReady: payoutStatus?.payoutReady ?? null,
    });
  }, [isOrganizer, organizerRole, organizerSite, payoutStatus]);

  if (!token) {
    return <Navigate to="/staff/login" replace />;
  }

  if (hydrateError && !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-muted-foreground break-words">
            {t("staffPortal.errors.restoreSession")}
          </p>
          <Button
            type="button"
            className="h-11 w-full"
            disabled={loading}
            onClick={() => {
              if (role) void dispatch(fetchStaffMe(role));
            }}
          >
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Do not gate on `loading` once we already have a user (e.g. just verified OTP).
  // A hung/in-flight /me would otherwise leave the portal on this spinner forever.
  if (!role || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = role === "admin";
  const NAV = getStaffNav(isAdmin, organizerRole).map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));

  const handleLogout = async () => {
    await dispatch(staffLogout());
    navigate("/staff/login", { replace: true });
  };

  const persistLanguage = (locale: AppLocale) => {
    if (!role) return;
    void dispatch(updateStaffLanguage({ locale, role }));
  };

  const displayName =
    user?.type === "admin" || user?.type === "organizer"
      ? `${user.firstName} ${user.lastName}`
      : "Staff";

  const navLinkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm font-medium transition-all min-w-0",
      isActive
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  const renderNavLink = (
    item: (typeof NAV)[number],
    opts?: { mobile?: boolean },
  ) => {
    const attentionKey = navAttention[item.to];
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => opts?.mobile && setMobileOpen(false)}
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {attentionKey ? (
          <AlertCircle
            className="w-4 h-4 shrink-0 text-destructive"
            aria-label={t(staffNavAttentionLabelKey(attentionKey))}
          />
        ) : null}
      </NavLink>
    );
  };

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>{NAV.map((item) => renderNavLink(item, { mobile }))}</>
  );

  const portalValue = {
    persistLanguage,
  };

  return (
    <StaffPortalProvider value={portalValue}>
    <div className="pace-site min-h-screen flex overflow-x-clip w-full max-w-full">
      {!eventConsoleMode ? (
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#e4e8e3] bg-[#fbfcf9] text-sidebar-foreground fixed inset-y-0">
        <div className="p-5 border-b border-[#e4e8e3]">
          <Link to="/staff" className="pace-wordmark text-[22px]" aria-label={t("landing.ariaHome")}>
            atleita<span>.</span>
          </Link>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#758176]">
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-primary" />
            )}
            {isAdmin ? t("staffPortal.nav.admin") : t("staffPortal.nav.organizer")}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-[#e4e8e3]">
          <Link
            to="/staff/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-[3px] hover:bg-secondary transition-colors mb-2 group"
          >
            <div className="w-9 h-9 rounded-[3px] overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {displayName
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground group-hover:text-primary transition-colors">
                {displayName}
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-[3px] text-sm text-sidebar-foreground/70 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" /> {t("staffPortal.nav.exit")}
          </button>
        </div>
      </aside>
      ) : null}

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 min-h-screen w-full max-w-full",
          !eventConsoleMode && "lg:ml-64",
        )}
      >
        {!eventConsoleMode ? (
        <header className="lg:hidden sticky top-0 z-40 bg-background border-b px-4 h-14 flex items-center justify-between gap-2 min-w-0 shrink-0">
          <span className="font-bold text-sm truncate">{t("staffPortal.nav.console")}</span>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher
              variant="ghost"
              className="pace-header-lang"
              onLanguageChange={persistLanguage}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>
        ) : null}

        {!eventConsoleMode && mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-[#fbfcf9] p-4 pt-16 overflow-y-auto overscroll-contain">
            <nav className="space-y-1">
              <NavItems mobile />
              <div className="mt-4 pt-4 border-t border-[#e4e8e3]">
                <Link
                  to="/staff/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[3px] hover:bg-secondary"
                >
                  <div className="w-9 h-9 rounded-[3px] overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {displayName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[3px] text-sm text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-5 h-5 shrink-0" /> {t("staffPortal.nav.exit")}
                </button>
              </div>
            </nav>
          </div>
        )}

        <main
          className={cn(
            "flex-1 min-w-0 w-full max-w-full overflow-x-clip",
            eventConsoleMode
              ? "p-0"
              : siteEditorMode
                ? "px-3 md:px-4 py-3 md:py-4"
                : "px-4 md:px-8 py-4 md:py-6",
          )}
        >
          <div
            className={cn(
              "mx-auto w-full min-w-0",
              fullBleedMain ? "max-w-none" : "max-w-[1600px]",
            )}
          >
            <Suspense fallback={<StaffPageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
    </StaffPortalProvider>
  );
}
