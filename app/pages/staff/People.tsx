import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Building2, Shield, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import StaffOrganizersPanel from "@/components/staff/StaffOrganizersPanel";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import StaffPlatformAdminsPanel from "@/components/staff/StaffPlatformAdminsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adminSyncOrganizerConnect } from "@/store/slices/staffPortalSlice";

type StaffTab = "organizers" | "admins";

export default function StaffPeople() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { role } = useAppSelector((s) => s.staffAuth);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: StaffTab = tabParam === "organizers" ? "organizers" : "admins";
  const organizerIdParam = Number(searchParams.get("organizerId"));
  const deepLinkOrganizerId =
    Number.isFinite(organizerIdParam) && organizerIdParam > 0 ? organizerIdParam : null;
  const connectFlag = searchParams.get("connect");

  useEffect(() => {
    if (role !== "admin") return;
    if (
      deepLinkOrganizerId == null ||
      (connectFlag !== "return" && connectFlag !== "refresh")
    ) {
      return;
    }
    void dispatch(adminSyncOrganizerConnect({ organizerId: deepLinkOrganizerId }));
  }, [connectFlag, deepLinkOrganizerId, dispatch, role]);

  if (tabParam === "payments") {
    return <Navigate to="/staff/payments" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/staff" replace />;
  }

  const setTab = (next: StaffTab) => {
    if (next === "admins") {
      searchParams.delete("tab");
      searchParams.delete("organizerId");
    } else {
      searchParams.set("tab", next);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={t("staffPortal.staffManagement.title")}
        description={t("staffPortal.staffManagement.subtitle")}
      />
      <StaffPageHeader
        icon={UserCog}
        title={t("staffPortal.staffManagement.title")}
        subtitle={t("staffPortal.staffManagement.subtitle")}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as StaffTab)}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="admins" className="gap-2">
            <Shield className="w-4 h-4 hidden sm:inline" />
            {t("staffPortal.staffManagement.tabAdmins")}
          </TabsTrigger>
          <TabsTrigger value="organizers" className="gap-2">
            <Building2 className="w-4 h-4 hidden sm:inline" />
            {t("staffPortal.staffManagement.tabOrganizers")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-4">
          <StaffPlatformAdminsPanel active={tab === "admins"} />
        </TabsContent>

        <TabsContent value="organizers" className="mt-4">
          <StaffOrganizersPanel
            active={tab === "organizers"}
            initialOrganizerId={deepLinkOrganizerId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
