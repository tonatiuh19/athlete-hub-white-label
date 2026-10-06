import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  LayoutDashboard,
  Mail,
  Pencil,
  Settings2,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
  canOrganizerEditEvents,
  canOrganizerManageRegistrations,
  canOrganizerViewPayments,
} from "@shared/staffRoles";

/** Top-level console route segments (not edit sub-tabs). */
export type EventConsoleRouteSection =
  | "overview"
  | "edit"
  | "ops"
  | "comunicacion"
  | "results"
  | "cobros"
  | "insights"
  | "advanced";

export type EventConsoleAccessCtx = {
  isAdmin: boolean;
  organizerRole?: string;
};

const always = () => true;

export const editorsOnly = ({
  isAdmin,
  organizerRole,
}: EventConsoleAccessCtx) =>
  isAdmin || canOrganizerEditEvents(organizerRole ?? "");

export const regsOnly = ({
  isAdmin,
  organizerRole,
}: EventConsoleAccessCtx) =>
  isAdmin || canOrganizerManageRegistrations(organizerRole ?? "");

export const paymentsOnly = ({
  isAdmin,
  organizerRole,
}: EventConsoleAccessCtx) =>
  isAdmin || canOrganizerViewPayments(organizerRole ?? "");

export const resultsOnly = ({
  isAdmin,
  organizerRole,
}: EventConsoleAccessCtx) => {
  if (isAdmin) return true;
  const r = organizerRole ?? "";
  return canOrganizerEditEvents(r) || r === "timing" || r === "operations";
};

export const insightsOnly = ({
  isAdmin,
  organizerRole,
}: EventConsoleAccessCtx) =>
  isAdmin ||
  ["owner", "organizer", "marketing", "finance"].includes(organizerRole ?? "");

const OPS_TABS = new Set(["registrations", "waitlist", "checkin"]);

export function isEventConsoleOpsTab(tab: string | null | undefined): boolean {
  return Boolean(tab && OPS_TABS.has(tab));
}

/**
 * Boletópolis-style nav node: parents carry icons + optional children;
 * children are leaf deep-links (no icon in the tree UI).
 */
export type EventConsoleNavNode = {
  id: string;
  /** Relative path under `/staff/events/:eventId` (no leading slash). */
  path: string;
  labelKey: string;
  icon?: LucideIcon;
  /** When set, highlight while on edit with this tab. */
  editTab?: string;
  /** When set, highlight while on ops with this tab. */
  opsTab?: string;
  visible: (ctx: EventConsoleAccessCtx) => boolean;
  children?: EventConsoleNavNode[];
};

/** @deprecated Prefer EventConsoleNavNode — kept for call-site typing. */
export type EventConsoleNavItem = EventConsoleNavNode;

export const EVENT_CONSOLE_TREE: EventConsoleNavNode[] = [
  {
    id: "overview",
    path: "overview",
    labelKey: "staffPortal.eventConsole.nav.overview",
    icon: LayoutDashboard,
    visible: always,
  },
  {
    id: "edit",
    path: "edit",
    labelKey: "staffPortal.eventConsole.nav.edit",
    icon: Pencil,
    visible: editorsOnly,
    children: [
      {
        id: "details",
        path: "edit?tab=details",
        labelKey: "staffPortal.eventConsole.nav.details",
        editTab: "details",
        visible: editorsOnly,
      },
      {
        id: "location",
        path: "edit?tab=location",
        labelKey: "staffPortal.eventConsole.nav.location",
        editTab: "location",
        visible: editorsOnly,
      },
      {
        id: "checkin",
        path: "edit?tab=checkin",
        labelKey: "staffPortal.eventConsole.nav.checkinWindow",
        editTab: "checkin",
        visible: editorsOnly,
      },
      {
        id: "registration",
        path: "edit?tab=registration",
        labelKey: "staffPortal.eventConsole.nav.registration",
        editTab: "registration",
        visible: editorsOnly,
      },
      {
        id: "description",
        path: "edit?tab=description",
        labelKey: "staffPortal.eventConsole.nav.description",
        editTab: "description",
        visible: editorsOnly,
      },
      {
        id: "images",
        path: "edit?tab=images",
        labelKey: "staffPortal.eventConsole.nav.images",
        editTab: "images",
        visible: editorsOnly,
      },
      {
        id: "media",
        path: "edit?tab=media",
        labelKey: "staffPortal.eventConsole.nav.media",
        editTab: "media",
        visible: editorsOnly,
      },
      {
        id: "course",
        path: "edit?tab=course",
        labelKey: "staffPortal.eventConsole.nav.course",
        editTab: "course",
        visible: editorsOnly,
      },
      {
        id: "waiver",
        path: "edit?tab=waiver",
        labelKey: "staffPortal.eventConsole.nav.waiver",
        editTab: "waiver",
        visible: editorsOnly,
      },
      {
        id: "sponsors",
        path: "edit?tab=sponsors",
        labelKey: "staffPortal.eventConsole.nav.sponsors",
        editTab: "sponsors",
        visible: editorsOnly,
      },
      {
        id: "policies",
        path: "edit?tab=policies",
        labelKey: "staffPortal.eventConsole.nav.policies",
        editTab: "policies",
        visible: ({ isAdmin }) => isAdmin,
      },
    ],
  },
  {
    id: "tickets",
    path: "edit?tab=categories",
    labelKey: "staffPortal.eventConsole.nav.tickets",
    icon: Ticket,
    visible: editorsOnly,
    children: [
      {
        id: "categories",
        path: "edit?tab=categories",
        labelKey: "staffPortal.eventConsole.nav.categories",
        editTab: "categories",
        visible: editorsOnly,
      },
      {
        id: "discounts",
        path: "edit?tab=discounts",
        labelKey: "staffPortal.eventConsole.nav.discounts",
        editTab: "discounts",
        visible: editorsOnly,
      },
      {
        id: "folios",
        path: "edit?tab=folios",
        labelKey: "staffPortal.eventConsole.nav.folios",
        editTab: "folios",
        visible: editorsOnly,
      },
      {
        id: "fields",
        path: "edit?tab=fields",
        labelKey: "staffPortal.eventConsole.nav.fields",
        editTab: "fields",
        visible: editorsOnly,
      },
      {
        id: "waves",
        path: "edit?tab=waves",
        labelKey: "staffPortal.eventConsole.nav.waves",
        editTab: "waves",
        visible: editorsOnly,
      },
      {
        id: "extras",
        path: "edit?tab=extras",
        labelKey: "staffPortal.eventConsole.nav.extras",
        editTab: "extras",
        visible: editorsOnly,
      },
      {
        id: "waitlist-setup",
        path: "edit?tab=waitlist",
        labelKey: "staffPortal.eventConsole.nav.waitlistSetup",
        editTab: "waitlist",
        visible: editorsOnly,
      },
    ],
  },
  {
    id: "ops",
    path: "ops",
    labelKey: "staffPortal.eventConsole.nav.ops",
    icon: Users,
    visible: regsOnly,
    children: [
      {
        id: "ops-registrations",
        path: "ops",
        labelKey: "staffPortal.eventConsole.nav.registrations",
        opsTab: "registrations",
        visible: regsOnly,
      },
      {
        id: "ops-waitlist",
        path: "ops?tab=waitlist",
        labelKey: "staffPortal.eventConsole.nav.waitlistOps",
        opsTab: "waitlist",
        visible: regsOnly,
      },
      {
        id: "ops-checkin",
        path: "ops?tab=checkin",
        labelKey: "staffPortal.eventConsole.nav.checkin",
        opsTab: "checkin",
        visible: regsOnly,
      },
    ],
  },
  {
    id: "comunicacion",
    path: "comunicacion",
    labelKey: "staffPortal.eventConsole.nav.comunicacion",
    icon: Mail,
    visible: editorsOnly,
  },
  {
    id: "results",
    path: "results",
    labelKey: "staffPortal.eventConsole.nav.results",
    icon: Trophy,
    visible: resultsOnly,
  },
  {
    id: "cobros",
    path: "cobros",
    labelKey: "staffPortal.eventConsole.nav.cobros",
    icon: Banknote,
    visible: paymentsOnly,
  },
  {
    id: "insights",
    path: "insights",
    labelKey: "staffPortal.eventConsole.nav.insights",
    icon: TrendingUp,
    visible: insightsOnly,
  },
  {
    id: "advanced",
    path: "advanced",
    labelKey: "staffPortal.eventConsole.nav.advanced",
    icon: Settings2,
    visible: editorsOnly,
  },
];

/** Flat list for tests / legacy callers (depth-first). */
export function flattenEventConsoleNav(
  nodes: EventConsoleNavNode[] = EVENT_CONSOLE_TREE,
): EventConsoleNavNode[] {
  const out: EventConsoleNavNode[] = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children?.length) {
      out.push(...flattenEventConsoleNav(node.children));
    }
  }
  return out;
}

/** @deprecated Use EVENT_CONSOLE_TREE — flat projection of the tree. */
export const EVENT_CONSOLE_NAV: EventConsoleNavNode[] =
  flattenEventConsoleNav(EVENT_CONSOLE_TREE);

export function getVisibleEventConsoleTree(
  ctx: EventConsoleAccessCtx,
  nodes: EventConsoleNavNode[] = EVENT_CONSOLE_TREE,
): EventConsoleNavNode[] {
  return nodes
    .filter((node) => node.visible(ctx))
    .map((node) => {
      if (!node.children?.length) return node;
      const children = getVisibleEventConsoleTree(ctx, node.children);
      return { ...node, children };
    });
}

/**
 * Flat visible nodes (parents + children). Prefer
 * {@link getVisibleEventConsoleTree} for the sidebar.
 */
export function getVisibleEventConsoleNav(
  ctx: EventConsoleAccessCtx,
): EventConsoleNavNode[] {
  return flattenEventConsoleNav(getVisibleEventConsoleTree(ctx));
}

export function canAccessEventConsoleSection(
  section: EventConsoleRouteSection,
  ctx: EventConsoleAccessCtx,
): boolean {
  switch (section) {
    case "overview":
      return true;
    case "edit":
      return editorsOnly(ctx);
    case "ops":
      return regsOnly(ctx);
    case "comunicacion":
      return editorsOnly(ctx);
    case "results":
      return resultsOnly(ctx);
    case "cobros":
      return paymentsOnly(ctx);
    case "insights":
      return insightsOnly(ctx);
    case "advanced":
      return editorsOnly(ctx);
    default:
      return false;
  }
}

/** Draft / pending → edit; published & others with ops access → ops; else overview. */
export function defaultEventConsolePath(input: {
  status?: string | null;
  isAdmin: boolean;
  organizerRole?: string;
  /** Legacy hub `?tab=` on index — prefer ops when relevant. */
  legacyTab?: string | null;
}): string {
  const ctx = {
    isAdmin: input.isAdmin,
    organizerRole: input.organizerRole,
  };
  const status = input.status ?? "draft";
  const canEdit = editorsOnly(ctx);
  const canOps = regsOnly(ctx);

  if (input.legacyTab === "sponsor-analytics" && insightsOnly(ctx)) {
    return "insights";
  }
  if (isEventConsoleOpsTab(input.legacyTab) && canOps) {
    const tab = input.legacyTab!;
    return tab === "registrations" ? "ops" : `ops?tab=${tab}`;
  }

  if ((status === "draft" || status === "pending_approval") && canEdit) {
    return "edit";
  }
  if (canOps) return "ops";
  if (canEdit) return "edit";
  return "overview";
}

export function eventConsoleBasePath(eventId: number): string {
  return `/staff/events/${eventId}`;
}

export function eventConsoleHref(eventId: number, path: string): string {
  const base = eventConsoleBasePath(eventId);
  if (path.includes("?")) {
    const [p, q] = path.split("?");
    return `${base}/${p}?${q}`;
  }
  return `${base}/${path}`;
}

/** Operations deep link (registrations / waitlist / check-in). */
export function eventConsoleOpsPath(
  eventId: number,
  tab?: string | null,
): string {
  const base = `${eventConsoleBasePath(eventId)}/ops`;
  if (!tab || tab === "registrations") return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export function eventConsolePaymentsPath(eventId: number): string {
  return `/staff/payments?eventId=${eventId}`;
}

function parseConsoleRest(pathname: string): { restPath: string } {
  const baseMatch = pathname.match(/\/staff\/events\/\d+(?:\/(.*))?$/);
  const rest = baseMatch?.[1] ?? "";
  const [restPath] = rest.split("?");
  return { restPath };
}

/** Match exact leaf / parent self-link (not “any child”). */
export function isEventConsoleNavActive(
  item: EventConsoleNavNode,
  pathname: string,
  search: string,
): boolean {
  const { restPath } = parseConsoleRest(pathname);
  const tab = new URLSearchParams(search).get("tab");

  if (item.opsTab) {
    return restPath === "ops" && (tab ?? "registrations") === item.opsTab;
  }

  if (item.editTab) {
    return restPath === "edit" && tab === item.editTab;
  }

  // Parent with children: exact active only on its own default path
  // (edit overview / ops default handled via children registrations).
  if (item.children?.length) {
    if (item.id === "edit") {
      return restPath === "edit" && (!tab || tab === "overview");
    }
    // tickets / ops: parent highlights via children only
    if (item.id === "ops" || item.id === "tickets") {
      return false;
    }
    return restPath === item.path;
  }

  if (item.path === "ops" || item.path.startsWith("ops?")) {
    return restPath === "ops" && (!tab || tab === "registrations");
  }

  if (item.path.startsWith("edit")) {
    if (restPath !== "edit") return false;
    if (!tab || tab === "overview") return true;
    return false;
  }

  return restPath === item.path || (item.path === "overview" && restPath === "");
}

/** Parent chrome: active when this node or any descendant matches. */
export function isEventConsoleBranchActive(
  item: EventConsoleNavNode,
  pathname: string,
  search: string,
): boolean {
  if (isEventConsoleNavActive(item, pathname, search)) return true;
  return (item.children ?? []).some((child) =>
    isEventConsoleBranchActive(child, pathname, search),
  );
}

export function isStaffEventConsolePath(pathname: string): boolean {
  const m = pathname.match(/^\/staff\/events\/(\d+)(?:\/|$)/);
  if (!m) return false;
  if (pathname.includes("/onboarding")) return false;
  return true;
}
