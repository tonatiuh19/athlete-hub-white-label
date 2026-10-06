import { useEffect, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import StaffFormMissingChips from "@/components/staff/StaffFormMissingChips";
import StaffMemberEventAccessFields, {
  memberRoleSupportsEventScope,
  type MemberEventAccessScope,
} from "@/components/staff/StaffMemberEventAccessFields";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOrganizerEvents,
  fetchOrganizerMembers,
  inviteOrganizerMember,
  updateOrganizerMember,
} from "@/store/slices/staffPortalSlice";
import { getDateFnsLocale } from "@/utils/dateLocale";
import { canOrganizerManageTeam } from "@/utils/staffNav";
import { getFormikMissingItems } from "@/utils/staffFormMissing";
import { StaffTableSkeleton } from "@/components/staff/skeletons/StaffSkeletons";

const inviteSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
  first_name: Yup.string().trim().required("Required"),
  last_name: Yup.string().trim().required("Required"),
  role: Yup.string().required("Required"),
  event_access_scope: Yup.string().oneOf(["organization", "events"]).required(),
  event_ids: Yup.array()
    .of(Yup.number())
    .when("event_access_scope", {
      is: "events",
      then: (schema) => schema.min(1, "Required"),
      otherwise: (schema) => schema,
    }),
});

const MEMBER_ROLES = [
  "organizer",
  "operations",
  "marketing",
  "finance",
  "timing",
  "sponsor",
  "seller",
] as const;

function memberRoleLabel(role: string, t: (key: string) => string): string {
  const key = `staffPortal.team.roles.${role}`;
  const translated = t(key);
  return translated === key ? role : translated;
}

function defaultScopeForRole(role: string): MemberEventAccessScope {
  if (!memberRoleSupportsEventScope(role)) return "organization";
  return role === "seller" ? "events" : "organization";
}

export default function StaffTeam() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const {
    teamMembers,
    loadingTeam,
    teamError,
    invitingMember,
    events,
    loadingEvents,
  } = useAppSelector((s) => s.staffPortal);
  const dateLocale = getDateFnsLocale(i18n.language);
  const isOwner = user?.type === "organizer" && canOrganizerManageTeam(user.role);

  useEffect(() => {
    if (role === "organizer") {
      dispatch(fetchOrganizerMembers());
      dispatch(fetchOrganizerEvents({ limit: 100, sortBy: "title", sortDir: "ASC" }));
    }
  }, [dispatch, role]);

  const formik = useFormik({
    initialValues: {
      email: "",
      first_name: "",
      last_name: "",
      role: "organizer",
      phone: "",
      event_access_scope: "organization" as MemberEventAccessScope,
      event_ids: [] as number[],
    },
    validationSchema: inviteSchema,
    onSubmit: async (values, { resetForm }) => {
      const supportsScope = memberRoleSupportsEventScope(values.role);
      const result = await dispatch(
        inviteOrganizerMember({
          email: values.email.trim(),
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          role: values.role,
          phone: values.phone.trim() || undefined,
          ...(supportsScope
            ? {
                event_access_scope: values.event_access_scope,
                event_ids:
                  values.event_access_scope === "events"
                    ? values.event_ids
                    : undefined,
              }
            : {}),
        }),
      );
      if (inviteOrganizerMember.fulfilled.match(result)) {
        resetForm({
          values: {
            email: "",
            first_name: "",
            last_name: "",
            role: "organizer",
            phone: "",
            event_access_scope: "organization",
            event_ids: [],
          },
        });
      }
    },
  });

  const inviteMissing = useMemo(() => {
    const labels: Record<string, string> = {
      email: "staffPortal.team.fieldEmail",
      first_name: "staffPortal.team.fieldFirst",
      last_name: "staffPortal.team.fieldLast",
      role: "staffPortal.team.fieldRole",
    };
    if (
      memberRoleSupportsEventScope(formik.values.role) &&
      formik.values.event_access_scope === "events"
    ) {
      labels.event_ids = "staffPortal.team.eventAccess";
    }
    return getFormikMissingItems(formik.values, inviteSchema, labels);
  }, [formik.values]);

  if (role !== "organizer") {
    return <Navigate to="/staff" replace />;
  }

  if (user?.type === "organizer" && !canOrganizerManageTeam(user.role)) {
    return <Navigate to="/staff" replace />;
  }

  const reload = () => dispatch(fetchOrganizerMembers());
  const eventOptions = events.map((e) => ({ id: e.id, title: e.title }));

  return (
    <div className="max-w-4xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={t("staffPortal.team.title")}
        description={t("staffPortal.team.subtitle")}
      />
      <StaffPageHeader
        icon={Users}
        title={t("staffPortal.team.title")}
        subtitle={t("staffPortal.team.subtitle")}
      />

      <PortalErrorAlert error={teamError} onRetry={reload} />

      {isOwner ? (
        <form onSubmit={formik.handleSubmit} className="card-sport p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("staffPortal.team.inviteTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("staffPortal.team.fieldEmail")}</Label>
              <Input id="email" type="email" {...formik.getFieldProps("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("staffPortal.team.fieldRole")}</Label>
              <Select
                value={formik.values.role}
                onValueChange={(v) => {
                  void formik.setFieldValue("role", v);
                  const nextScope = defaultScopeForRole(v);
                  void formik.setFieldValue("event_access_scope", nextScope);
                  if (nextScope === "organization") {
                    void formik.setFieldValue("event_ids", []);
                  }
                }}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {memberRoleLabel(r, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("staffPortal.team.fieldFirst")}</Label>
              <Input id="first_name" {...formik.getFieldProps("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("staffPortal.team.fieldLast")}</Label>
              <Input id="last_name" {...formik.getFieldProps("last_name")} />
            </div>
          </div>

          {memberRoleSupportsEventScope(formik.values.role) ? (
            <StaffMemberEventAccessFields
              role={formik.values.role}
              scope={formik.values.event_access_scope}
              eventIds={formik.values.event_ids}
              events={eventOptions}
              loadingEvents={loadingEvents}
              onScopeChange={(scope) => {
                void formik.setFieldValue("event_access_scope", scope);
                if (scope === "organization") {
                  void formik.setFieldValue("event_ids", []);
                }
              }}
              onEventIdsChange={(ids) => void formik.setFieldValue("event_ids", ids)}
            />
          ) : null}

          <StaffFormMissingChips
            items={inviteMissing}
            showCompleteState={inviteMissing.length === 0}
          />
          <Button type="submit" disabled={invitingMember}>
            {invitingMember ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {t("staffPortal.team.addMember")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground card-sport p-4">
          {t("staffPortal.team.ownerOnly")}
        </p>
      )}

      {loadingTeam ? (
        <StaffTableSkeleton rows={5} columns={6} />
      ) : teamError ? null : (
        <div className="card-sport overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">{t("staffPortal.team.colName")}</th>
                  <th className="p-4 font-medium">{t("staffPortal.team.colEmail")}</th>
                  <th className="p-4 font-medium">{t("staffPortal.team.colRole")}</th>
                  <th className="p-4 font-medium">{t("staffPortal.team.colAccess")}</th>
                  <th className="p-4 font-medium">{t("staffPortal.team.colStatus")}</th>
                  <th className="p-4 font-medium">{t("staffPortal.team.colJoined")}</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 align-top">
                    <td className="p-4 font-medium whitespace-nowrap">
                      {m.first_name} {m.last_name}
                    </td>
                    <td className="p-4 text-muted-foreground">{m.email}</td>
                    <td className="p-4">{memberRoleLabel(m.role, t)}</td>
                    <td className="p-4 min-w-[12rem]">
                      {isOwner && memberRoleSupportsEventScope(m.role) ? (
                        <StaffMemberEventAccessFields
                          compact
                          role={m.role}
                          scope={m.event_access_scope ?? "organization"}
                          eventIds={m.assigned_event_ids ?? []}
                          events={eventOptions}
                          loadingEvents={loadingEvents}
                          onScopeChange={(scope) => {
                            if (scope === "organization") {
                              void dispatch(
                                updateOrganizerMember({
                                  memberId: m.id,
                                  event_access_scope: "organization",
                                }),
                              );
                              return;
                            }
                            const ids =
                              m.assigned_event_ids?.length
                                ? m.assigned_event_ids
                                : eventOptions.slice(0, 1).map((e) => e.id);
                            if (ids.length === 0) return;
                            void dispatch(
                              updateOrganizerMember({
                                memberId: m.id,
                                event_access_scope: "events",
                                event_ids: ids,
                              }),
                            );
                          }}
                          onEventIdsChange={(event_ids) => {
                            if (event_ids.length === 0) return;
                            void dispatch(
                              updateOrganizerMember({
                                memberId: m.id,
                                event_access_scope: "events",
                                event_ids,
                              }),
                            );
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {memberRoleSupportsEventScope(m.role) &&
                          m.event_access_scope === "events"
                            ? t("staffPortal.team.accessSelectedEvents")
                            : t("staffPortal.team.accessAllEvents")}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isOwner && m.role !== "owner" ? (
                        <Select
                          value={m.status}
                          onValueChange={(v) =>
                            void dispatch(
                              updateOrganizerMember({ memberId: m.id, status: v }),
                            )
                          }
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["invited", "active", "inactive", "suspended"].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StaffStatusBadge status={m.status} />
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(m.created_at), "d MMM yyyy", { locale: dateLocale })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
