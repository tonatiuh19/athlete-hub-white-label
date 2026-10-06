import type { LucideIcon } from "lucide-react";
import {
  canOrganizerCreateEvents as sharedCanOrganizerCreateEvents,
  canOrganizerEditEvents as sharedCanOrganizerEditEvents,
  canOrganizerManageRegistrations as sharedCanOrganizerManageRegistrations,
  canOrganizerManageSimulations as sharedCanOrganizerManageSimulations,
  canOrganizerRecordManualSale as sharedCanOrganizerRecordManualSale,
  canOrganizerViewAllPayments as sharedCanOrganizerViewAllPayments,
  canOrganizerViewAnalytics as sharedCanOrganizerViewAnalytics,
  canOrganizerViewPayments as sharedCanOrganizerViewPayments,
  canOrganizerViewSellerSalesSummary as sharedCanOrganizerViewSellerSalesSummary,
} from "@shared/staffRoles";
import {
  BarChart3,
  Calendar,
  CreditCard,
  Globe,
  LayoutDashboard,
  Palette,
  Scale,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

export interface StaffNavItem {
  to: string;
  end?: boolean;
  labelKey: string;
  icon: LucideIcon;
}

function withMessagingNav(items: StaffNavItem[], _role?: string): StaffNavItem[] {
  return items;
}

const ADMIN_NAV: StaffNavItem[] = [
  { to: "/staff", end: true, labelKey: "staffPortal.nav.dashboard", icon: LayoutDashboard },
  { to: "/staff/athletes", labelKey: "staffPortal.nav.athletes", icon: Users },
  { to: "/staff/people", labelKey: "staffPortal.nav.staffManagement", icon: UserCog },
  { to: "/staff/events", labelKey: "staffPortal.nav.events", icon: Calendar },
  { to: "/staff/payments", labelKey: "staffPortal.nav.payments", icon: CreditCard },
  { to: "/staff/analytics", labelKey: "staffPortal.nav.analytics", icon: BarChart3 },
  { to: "/staff/site-settings", labelKey: "staffPortal.nav.siteSettings", icon: Globe },
  { to: "/staff/profile", labelKey: "staffPortal.nav.profile", icon: Settings },
];

function organizerNav(role: string): StaffNavItem[] {
  const dashboard: StaffNavItem = {
    to: "/staff",
    end: true,
    labelKey: "staffPortal.nav.dashboard",
    icon: LayoutDashboard,
  };
  const events: StaffNavItem = {
    to: "/staff/events",
    labelKey: "staffPortal.nav.myEvents",
    icon: Calendar,
  };
  const registrations: StaffNavItem = {
    to: "/staff/registrations",
    labelKey: "staffPortal.nav.registrations",
    icon: Users,
  };
  const payments: StaffNavItem = {
    to: "/staff/payments",
    labelKey: "staffPortal.nav.payments",
    icon: CreditCard,
  };
  const analytics: StaffNavItem = {
    to: "/staff/analytics",
    labelKey: "staffPortal.nav.analytics",
    icon: BarChart3,
  };
  const team: StaffNavItem = {
    to: "/staff/team",
    labelKey: "staffPortal.nav.team",
    icon: UserCog,
  };
  const settings: StaffNavItem = {
    to: "/staff/profile",
    labelKey: "staffPortal.nav.profile",
    icon: Settings,
  };
  const siteEditor: StaffNavItem = {
    to: "/staff/site",
    labelKey: "staffPortal.nav.siteEditor",
    icon: Palette,
  };
  const siteLegal: StaffNavItem = {
    to: "/staff/legal",
    labelKey: "staffPortal.nav.siteLegal",
    icon: Scale,
  };

  switch (role) {
    case "timing":
      return withMessagingNav([dashboard, registrations, events], role);
    case "operations":
      return withMessagingNav(
        [dashboard, events, registrations, payments, settings],
        role,
      );
    case "marketing":
      return withMessagingNav(
        [dashboard, events, analytics, siteEditor, siteLegal, settings],
        role,
      );
    case "finance":
      return withMessagingNav(
        [dashboard, events, registrations, payments, analytics, settings],
        role,
      );
    case "seller":
      // Events list → event Cobros for cash sales (manual_sales_enabled); no edit per EVENT_EDITOR_ROLES.
      return [dashboard, events, payments, settings];
    case "sponsor":
      return withMessagingNav([dashboard, events, settings], role);
    case "owner":
      return withMessagingNav(
        [
          dashboard,
          events,
          registrations,
          payments,
          analytics,
          team,
          siteEditor,
          siteLegal,
          settings,
        ],
        role,
      );
    case "organizer":
    default:
      return withMessagingNav(
        [
          dashboard,
          events,
          registrations,
          payments,
          analytics,
          siteEditor,
          siteLegal,
          settings,
        ],
        role,
      );
  }
}

export function getStaffNav(isAdmin: boolean, organizerRole?: string): StaffNavItem[] {
  if (isAdmin) return ADMIN_NAV;
  return organizerNav(organizerRole ?? "organizer");
}

export function canOrganizerEditEvents(role: string): boolean {
  return sharedCanOrganizerEditEvents(role);
}

export function canOrganizerViewAnalytics(role: string): boolean {
  return sharedCanOrganizerViewAnalytics(role);
}

export function canOrganizerManageRegistrations(role: string): boolean {
  return sharedCanOrganizerManageRegistrations(role);
}

/** Admin always; organizer members via REGISTRATION_OPS_ROLES (includes timing). */
export function canStaffManageRegistrations(
  isAdmin: boolean,
  organizerRole?: string,
): boolean {
  if (isAdmin) return true;
  return sharedCanOrganizerManageRegistrations(organizerRole ?? "");
}

export function canOrganizerManageTeam(role: string): boolean {
  return role === "owner";
}

export function canOrganizerCreateEvents(role: string): boolean {
  return sharedCanOrganizerCreateEvents(role);
}

export function canOrganizerManageSimulations(role: string): boolean {
  return sharedCanOrganizerManageSimulations(role);
}

export function canOrganizerRecordManualSale(role: string): boolean {
  return sharedCanOrganizerRecordManualSale(role);
}

export function canViewStaffPayments(isAdmin: boolean, organizerRole?: string): boolean {
  if (isAdmin) return true;
  return sharedCanOrganizerViewPayments(organizerRole ?? "");
}

export function canViewAllStaffPayments(isAdmin: boolean, organizerRole?: string): boolean {
  if (isAdmin) return true;
  return sharedCanOrganizerViewAllPayments(organizerRole ?? "");
}

export function canViewSellerSalesSummary(isAdmin: boolean, organizerRole?: string): boolean {
  if (isAdmin) return false;
  return sharedCanOrganizerViewSellerSalesSummary(organizerRole ?? "");
}

/** Organizer self-serve payout setup (same roles as payments for finance/owner). */
export function canAccessStaffPayouts(isAdmin: boolean, organizerRole?: string): boolean {
  if (isAdmin) return false;
  return ["owner", "organizer", "finance"].includes(organizerRole ?? "");
}

/** Event Cobros “Open payouts” setup CTA — admins (People) or organizer payout roles. */
export function canShowCobrosPayoutSetupCta(
  isAdmin: boolean,
  organizerRole?: string,
): boolean {
  return isAdmin || canAccessStaffPayouts(false, organizerRole);
}

/**
 * Where staff open payout / Connect setup.
 * Admins must not use organizer JWT payout routes — Connect lives in People.
 * Organizers open Pagos → Configurar (`/staff/payments?tab=setup`).
 */
export function staffPayoutSetupPath(
  isAdmin: boolean,
  organizerId?: number | null,
): string {
  if (!isAdmin) return "/staff/payments?tab=setup";
  if (organizerId != null && Number.isFinite(organizerId) && organizerId > 0) {
    return `/staff/people?tab=organizers&organizerId=${organizerId}`;
  }
  return "/staff/people?tab=organizers";
}

/** Refund permissions — sellers can record sales but not refund. */
export function canRefundStaffPayments(isAdmin: boolean, organizerRole?: string): boolean {
  if (isAdmin) return true;
  return ["owner", "organizer", "finance"].includes(organizerRole ?? "");
}

/** $0 / free / coupon-covered payments have nothing to refund. */
export function isStaffPaymentRefundable(payment: {
  status: string;
  amount_cents: number;
}): boolean {
  return payment.status === "succeeded" && Number(payment.amount_cents) > 0;
}
