import { Navigate, useParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
  canAccessEventConsoleSection,
  defaultEventConsolePath,
  eventConsoleHref,
  type EventConsoleRouteSection,
} from "@/utils/eventConsoleNav";

type Props = {
  section: EventConsoleRouteSection;
  children: React.ReactNode;
};

/**
 * Hide-by-role is not enough — block direct URL access to gated console sections.
 */
export default function EventConsoleSectionGuard({
  section,
  children,
}: Props) {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const eventDetail = useAppSelector((s) => s.staffPortal.eventDetail);

  const isAdmin = role === "admin";
  const organizerRole =
    user?.type === "organizer" ? user.role : undefined;
  const ctx = { isAdmin, organizerRole };

  if (!Number.isFinite(eventId)) {
    return <Navigate to="/staff/events" replace />;
  }

  if (!canAccessEventConsoleSection(section, ctx)) {
    let fallback = defaultEventConsolePath({
      status:
        eventDetail?.event?.id === eventId
          ? eventDetail.event.status
          : undefined,
      isAdmin,
      organizerRole,
    });
    const fallbackSection = fallback.split("?")[0] as EventConsoleRouteSection;
    if (
      fallbackSection === section ||
      !canAccessEventConsoleSection(fallbackSection, ctx)
    ) {
      fallback = "overview";
    }
    return <Navigate to={eventConsoleHref(eventId, fallback)} replace />;
  }

  return <>{children}</>;
}
