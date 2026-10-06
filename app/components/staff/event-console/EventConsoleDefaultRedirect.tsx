import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { useAppSelector } from "@/store/hooks";
import { defaultEventConsolePath } from "@/utils/eventConsoleNav";

/**
 * Draft / pending_approval → edit; published (etc.) → ops when allowed.
 * Preserves legacy `?tab=` hub deep links onto `/ops` or `/insights`.
 */
export default function EventConsoleDefaultRedirect() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const [searchParams] = useSearchParams();
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { eventDetailError } = useAppSelector((s) => s.staffPortal);
  const { event, loading } = useEnsureStaffEventDetail(eventId);

  const isAdmin = role === "admin";
  const organizerRole =
    user?.type === "organizer" ? user.role : undefined;

  if (!Number.isFinite(eventId)) {
    return <Navigate to="/staff/events" replace />;
  }

  if (eventDetailError && !event) {
    return <Navigate to="/staff/events" replace />;
  }

  if (loading && !event) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const path = defaultEventConsolePath({
    status: event?.status,
    isAdmin,
    organizerRole,
    legacyTab: searchParams.get("tab"),
  });

  return <Navigate to={path} replace />;
}
