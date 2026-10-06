import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

/** Legacy admin create → same cool wizard as organizers (with org pre-step). */
export default function AdminCreateEventPage() {
  const { role } = useAppSelector((s) => s.staffAuth);
  if (role && role !== "admin") {
    return <Navigate to="/staff/events" replace />;
  }
  return <Navigate to="/staff/events/new" replace />;
}
