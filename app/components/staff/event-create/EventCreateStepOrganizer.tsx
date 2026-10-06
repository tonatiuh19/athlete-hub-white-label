import { useEffect, useState } from "react";
import { Building2, Check, MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { StaffEventCardsSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminOrganizers } from "@/store/slices/staffPortalSlice";
import type { AdminOrganizerRow } from "@shared/api";
import { cn } from "@/lib/utils";

export interface EventCreateStepOrganizerProps {
  selectedOrg: AdminOrganizerRow | null;
  onSelect: (org: AdminOrganizerRow) => void;
}

export default function EventCreateStepOrganizer({
  selectedOrg,
  onSelect,
}: EventCreateStepOrganizerProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    adminOrganizers,
    loadingAdminOrganizers,
    adminOrganizersError,
  } = useAppSelector((s) => s.staffPortal);

  const [orgQuery, setOrgQuery] = useState("");
  const [debouncedOrgQ, setDebouncedOrgQ] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedOrgQ(orgQuery.trim()), 300);
    return () => window.clearTimeout(id);
  }, [orgQuery]);

  useEffect(() => {
    void dispatch(fetchAdminOrganizers({ q: debouncedOrgQ }));
  }, [dispatch, debouncedOrgQ]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0 hidden sm:flex">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {t("staffPortal.eventCreate.wizardSteps.organizer.formTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("staffPortal.eventCreate.wizardSteps.organizer.formHint")}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={orgQuery}
          onChange={(e) => setOrgQuery(e.target.value)}
          placeholder={t("staffPortal.eventCreate.wizardSteps.organizer.search")}
          className="pl-9 h-12"
          autoFocus
        />
      </div>

      <PortalErrorAlert
        error={adminOrganizersError}
        onRetry={() => dispatch(fetchAdminOrganizers({ q: debouncedOrgQ }))}
      />

      <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
        {loadingAdminOrganizers ? (
          <StaffEventCardsSkeleton count={4} className="sm:grid-cols-2 col-span-2" />
        ) : adminOrganizers.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">
            {t("staffPortal.eventCreate.wizardSteps.organizer.empty")}
          </p>
        ) : (
          adminOrganizers.map((org) => {
            const selected = selectedOrg?.id === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => onSelect(org)}
                className={cn(
                  "text-left p-3 rounded-xl border transition-all",
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/25"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{org.email}</p>
                    {org.city ? (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {org.city}
                      </p>
                    ) : null}
                  </div>
                  {selected ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
