import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

/** Legacy global messaging — broadcasts live in Event Console → Comunicación. */
export default function StaffMessaging() {
  const { events } = useAppSelector((s) => s.staffPortal);
  const firstEventId = events[0]?.id;
  if (firstEventId) {
    return (
      <Navigate to={`/staff/events/${firstEventId}/comunicacion`} replace />
    );
  }
  return <Navigate to="/staff/events" replace />;
}
