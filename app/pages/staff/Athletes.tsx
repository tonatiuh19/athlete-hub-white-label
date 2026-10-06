import { Navigate, useSearchParams } from "react-router-dom";
import { ClipboardList, UserCircle, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import StaffAthletesAccountsPanel from "@/components/staff/StaffAthletesAccountsPanel";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import StaffGlobalRegistrationsPanel from "@/components/staff/StaffGlobalRegistrationsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/store/hooks";

type PeopleTab = "accounts" | "registrations";

export default function StaffAthletes() {
  const { t } = useTranslation();
  const { role } = useAppSelector((s) => s.staffAuth);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: PeopleTab = tabParam === "registrations" ? "registrations" : "accounts";

  if (role !== "admin") {
    return <Navigate to="/staff" replace />;
  }

  const setTab = (next: PeopleTab) => {
    if (next === "accounts") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", next);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={t("staffPortal.athletes.title")}
        description={t("staffPortal.people.subtitle")}
      />
      <StaffPageHeader
        icon={Users}
        title={t("staffPortal.athletes.title")}
        subtitle={t("staffPortal.people.subtitle")}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as PeopleTab)}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="accounts" className="gap-2">
            <UserCircle className="w-4 h-4 hidden sm:inline" />
            {t("staffPortal.people.tabAccounts")}
          </TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2">
            <ClipboardList className="w-4 h-4 hidden sm:inline" />
            {t("staffPortal.people.tabRegistrations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <StaffAthletesAccountsPanel />
        </TabsContent>

        <TabsContent value="registrations" className="mt-4">
          <StaffGlobalRegistrationsPanel role="admin" active={tab === "registrations"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
