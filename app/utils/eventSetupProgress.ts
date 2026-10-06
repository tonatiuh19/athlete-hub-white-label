import type { EventPublishReadiness } from "@/components/staff/StaffEventPublishChecklist";
import {
  EVENT_SETUP_SECTIONS,
  type EventSetupSectionDef,
  type EventSetupSectionId,
} from "@/utils/eventSetupSections";

export function eventSetupSectionDone(
  id: EventSetupSectionId,
  readiness: EventPublishReadiness,
): boolean | null {
  switch (id) {
    case "details":
      return (
        readiness.hasTitle &&
        readiness.hasSport &&
        readiness.hasStartDate &&
        readiness.hasLocation
      );
    case "categories":
      return readiness.hasCategory;
    case "siteLegal":
      return readiness.hasSiteLegal;
    case "payouts":
      if (readiness.payoutReady === undefined) return true;
      if (readiness.payoutReady === null) return null;
      return readiness.payoutReady;
    case "waiver":
      return readiness.hasWaiver;
    case "course":
      return readiness.hasCourse;
    case "media":
      return readiness.hasHero;
    default:
      return false;
  }
}

export type EventSetupCardStatus = "done" | "todo" | "loading" | "optional-todo";

export function eventSetupCardStatus(
  section: EventSetupSectionDef,
  readiness: EventPublishReadiness,
): EventSetupCardStatus {
  const done = eventSetupSectionDone(section.id, readiness);
  if (done === null) return "loading";
  if (done) return "done";
  if (section.level === "optional") return "optional-todo";
  return "todo";
}

export function computeEventSetupProgressPct(
  readiness: EventPublishReadiness,
  visibleSections: EventSetupSectionDef[] = EVENT_SETUP_SECTIONS,
): number {
  const scored = visibleSections.filter((s) => s.level !== "optional");
  const doneCount = scored.filter(
    (s) => eventSetupCardStatus(s, readiness) === "done",
  ).length;
  return scored.length ? Math.round((doneCount / scored.length) * 100) : 0;
}

export function filterVisibleSetupSections(
  hasPaidCategories: boolean,
  payoutReady: boolean | null | undefined,
): EventSetupSectionDef[] {
  return EVENT_SETUP_SECTIONS.filter((s) => {
    if (s.id === "payouts") {
      return hasPaidCategories || payoutReady !== undefined;
    }
    return true;
  });
}
