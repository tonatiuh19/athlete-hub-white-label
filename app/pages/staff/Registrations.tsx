import { Navigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import StaffGlobalRegistrationsPanel from "@/components/staff/StaffGlobalRegistrationsPanel";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import { useAppSelector } from "@/store/hooks";

/** Organizer-only registrations page. Admins use /staff/athletes?tab=registrations */
export default function StaffRegistrations() {
  const { t } = useTranslation();
  const { role } = useAppSelector((s) => s.staffAuth);

  if (role === "admin") {
    return <Navigate to="/staff/athletes?tab=registrations" replace />;
  }

  if (role !== "organizer") {
    return <Navigate to="/staff" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={t("staffPortal.registrations.title")}
        description={t("staffPortal.registrations.subtitle")}
      />
      <StaffPageHeader
        icon={ClipboardList}
        title={t("staffPortal.registrations.title")}
        subtitle={t("staffPortal.registrations.subtitle")}
      />

      <StaffGlobalRegistrationsPanel role="organizer" />
    </div>
  );
}
