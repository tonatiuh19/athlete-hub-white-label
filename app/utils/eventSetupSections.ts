import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CreditCard,
  FileText,
  Flag,
  ImageIcon,
  Map,
  Handshake,
  Percent,
  Scale,
  Sparkles,
  Ticket,
  Users,
  Waves,
} from "lucide-react";

/** Setup sections shown as cards after guided create. */
export type EventSetupSectionId =
  | "details"
  | "categories"
  | "siteLegal"
  | "payouts"
  | "discounts"
  | "folios"
  | "waiver"
  | "course"
  | "media"
  | "fields"
  | "waves"
  | "waitlist"
  | "extras"
  | "sponsors";

export type EventSetupSectionLevel = "required" | "recommended" | "optional";

export type EventSetupSectionDef = {
  id: EventSetupSectionId;
  /** EventEdit tab to open (null for external payouts/legal) */
  tab: string | null;
  level: EventSetupSectionLevel;
  icon: LucideIcon;
  /** Order in hub (1-based) */
  order: number;
  externalPath?: string;
};

export const EVENT_SETUP_SECTIONS: EventSetupSectionDef[] = [
  {
    id: "details",
    tab: "details",
    level: "required",
    icon: ClipboardList,
    order: 1,
  },
  {
    id: "categories",
    tab: "categories",
    level: "required",
    icon: Ticket,
    order: 2,
  },
  {
    id: "siteLegal",
    tab: null,
    level: "required",
    icon: Scale,
    order: 3,
    externalPath: "/staff/legal",
  },
  {
    id: "payouts",
    tab: null,
    level: "required",
    icon: CreditCard,
    order: 4,
    externalPath: "/staff/payments?tab=setup",
  },
  {
    id: "discounts",
    tab: "discounts",
    level: "optional",
    icon: Percent,
    order: 5,
  },
  {
    id: "folios",
    tab: "folios",
    level: "recommended",
    icon: Flag,
    order: 6,
  },
  {
    id: "waiver",
    tab: "waiver",
    level: "recommended",
    icon: FileText,
    order: 7,
  },
  {
    id: "course",
    tab: "course",
    level: "recommended",
    icon: Map,
    order: 8,
  },
  {
    id: "media",
    /** Cover images (hero + banner) live under the Images edit tab. */
    tab: "images",
    level: "recommended",
    icon: ImageIcon,
    order: 9,
  },
  {
    id: "fields",
    tab: "fields",
    level: "optional",
    icon: ClipboardList,
    order: 10,
  },
  {
    id: "waves",
    tab: "waves",
    level: "optional",
    icon: Waves,
    order: 11,
  },
  {
    id: "waitlist",
    tab: "waitlist",
    level: "optional",
    icon: Users,
    order: 12,
  },
  {
    id: "extras",
    tab: "extras",
    level: "optional",
    icon: Sparkles,
    order: 13,
  },
  {
    id: "sponsors",
    tab: "sponsors",
    level: "optional",
    icon: Handshake,
    order: 14,
  },
];

export function eventSetupPath(eventId: number): string {
  return `/staff/events/${eventId}/edit`;
}

export function eventSetupSectionPath(
  eventId: number,
  section: EventSetupSectionId,
): string {
  return eventSetupEditPath(eventId, section);
}

export function eventAdvancedEditPath(
  eventId: number,
  tab?: string | null,
): string {
  const base = `/staff/events/${eventId}/edit`;
  if (!tab) return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export function eventSetupEditPath(
  eventId: number,
  section: EventSetupSectionId,
): string {
  const def = EVENT_SETUP_SECTIONS.find((s) => s.id === section);
  if (def?.externalPath) return def.externalPath;
  const tab = def?.tab ?? "details";
  return `/staff/events/${eventId}/edit?tab=${encodeURIComponent(tab)}`;
}

export function isEventSetupSectionId(value: string): value is EventSetupSectionId {
  return EVENT_SETUP_SECTIONS.some((s) => s.id === value);
}
