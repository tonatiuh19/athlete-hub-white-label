import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStaffEventDetail } from "@/store/slices/staffPortalSlice";
import type { StaffRole } from "@shared/api";

/** Fetch event detail only when missing or for a different event id. */
export function useEnsureStaffEventDetail(eventId: number) {
  const dispatch = useAppDispatch();
  const { role } = useAppSelector((s) => s.staffAuth);
  const eventDetail = useAppSelector((s) => s.staffPortal.eventDetail);
  const loadingEventDetail = useAppSelector(
    (s) => s.staffPortal.loadingEventDetail,
  );
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";

  useEffect(() => {
    if (!role || !Number.isFinite(eventId)) return;
    if (eventDetail?.event?.id === eventId) return;
    void dispatch(fetchStaffEventDetail({ eventId, role: staffRole }));
  }, [dispatch, eventId, staffRole, role, eventDetail?.event?.id]);

  return {
    event:
      eventDetail?.event?.id === eventId ? eventDetail.event : undefined,
    eventDetail:
      eventDetail?.event?.id === eventId ? eventDetail : undefined,
    loading: loadingEventDetail && eventDetail?.event?.id !== eventId,
  };
}
