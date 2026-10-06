import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Mail,
  Megaphone,
  Send,
  Sparkles,
} from "lucide-react";
import DOMPurify from "dompurify";
import MetaHelmet from "@/components/MetaHelmet";
import RichHtmlEditor from "@/components/editor/RichHtmlEditor";
import { useEventConsoleRequired } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateTimePickerField from "@/components/ui/datetime-picker-field";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createEventBroadcast,
  fetchEventBroadcastAudience,
  fetchEventBroadcastHistory,
  fetchEventBroadcastTemplates,
  previewEventBroadcast,
} from "@/store/slices/staffPortalSlice";
import type {
  EventBroadcastRow,
  EventBroadcastSendMode,
  EventBroadcastTemplateKey,
  StaffRole,
} from "@shared/api";
import { cn } from "@/lib/utils";

function statusBadgeVariant(
  status: EventBroadcastRow["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "sent":
      return "default";
    case "scheduled":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export default function EventConsoleComunicacion() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { eventId } = useEventConsoleRequired();
  const { role } = useAppSelector((s) => s.staffAuth);
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";
  const { event } = useEnsureStaffEventDetail(eventId);

  const {
    eventBroadcasts,
    loadingEventBroadcasts,
    eventBroadcastAudience,
    loadingEventBroadcastAudience,
    eventBroadcastTemplates,
    loadingEventBroadcastTemplates,
    sendingEventBroadcast,
    eventBroadcastSendError,
    lastEventBroadcastSend,
    previewingEventBroadcast,
    eventBroadcastPreviewHtml,
    eventBroadcastPreviewFrom,
  } = useAppSelector((s) => s.staffPortal);

  const [templateKey, setTemplateKey] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [sendMode, setSendMode] = useState<EventBroadcastSendMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  useEffect(() => {
    dispatch(fetchEventBroadcastHistory({ eventId, role: staffRole }));
    dispatch(fetchEventBroadcastAudience({ eventId, role: staffRole }));
    dispatch(fetchEventBroadcastTemplates({ eventId, role: staffRole }));
  }, [dispatch, eventId, staffRole]);

  const applyTemplate = useCallback(
    (key: EventBroadcastTemplateKey) => {
      const tpl = eventBroadcastTemplates.find((item) => item.key === key);
      if (!tpl) return;
      setTemplateKey(key);
      setSubject(tpl.subject);
      setPreheader(tpl.preheader);
      setTitle(tpl.title);
      setContentHtml(tpl.bodyHtml);
    },
    [eventBroadcastTemplates],
  );

  useEffect(() => {
    if (eventBroadcastTemplates.length > 0 && !templateKey) {
      applyTemplate(eventBroadcastTemplates[0].key);
    }
  }, [eventBroadcastTemplates, templateKey, applyTemplate]);

  useEffect(() => {
    if (!subject || !contentHtml) return;
    const timer = window.setTimeout(() => {
      dispatch(
        previewEventBroadcast({
          eventId,
          role: staffRole,
          subject,
          contentHtml,
          preheader,
          title: title || subject,
        }),
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    dispatch,
    eventId,
    staffRole,
    subject,
    contentHtml,
    preheader,
    title,
  ]);

  const recipientCount = eventBroadcastAudience?.recipientCount ?? 0;
  const canSend =
    Boolean(subject.trim() && contentHtml.trim()) &&
    recipientCount > 0 &&
    acknowledgedWarning &&
    (sendMode === "now" || Boolean(scheduledAt));

  const previewSrcDoc = useMemo(() => {
    if (!eventBroadcastPreviewHtml) return "";
    return DOMPurify.sanitize(eventBroadcastPreviewHtml, {
      WHOLE_DOCUMENT: true,
      ADD_ATTR: ["target"],
    });
  }, [eventBroadcastPreviewHtml]);

  const handleSend = async () => {
    if (!canSend) return;
    const result = await dispatch(
      createEventBroadcast({
        eventId,
        role: staffRole,
        subject: subject.trim(),
        contentHtml: contentHtml.trim(),
        preheader: preheader.trim() || subject.trim(),
        title: (title || subject).trim(),
        templateKey: (templateKey as EventBroadcastTemplateKey) || null,
        sendMode,
        scheduledAt: sendMode === "scheduled" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
      }),
    );
    if (createEventBroadcast.fulfilled.match(result)) {
      if (result.payload.broadcast.status === "failed") {
        return;
      }
      setAcknowledgedWarning(false);
      dispatch(fetchEventBroadcastHistory({ eventId, role: staffRole }));
      dispatch(fetchEventBroadcastAudience({ eventId, role: staffRole }));
    }
  };

  const localeDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  };

  return (
    <div className="space-y-6 animate-slide-up min-w-0">
      <MetaHelmet title={t("staffPortal.eventConsole.comunicacion.title")} />
      <EventConsoleSectionHeader
        title={t("staffPortal.eventConsole.comunicacion.title")}
        subdomain={event?.subdomain}
        subdomainLive={
          event?.status === "published" || event?.status === "completed"
        }
      />

      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t("staffPortal.eventConsole.comunicacion.heroBadge")}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {t("staffPortal.eventConsole.comunicacion.heroTitle", {
                organizer: event?.organizer_name ?? t("staffPortal.eventConsole.comunicacion.you"),
              })}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {t("staffPortal.eventConsole.comunicacion.heroBody")}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1.5 self-start">
            <Mail className="h-3.5 w-3.5" />
            {loadingEventBroadcastAudience
              ? t("common.loading")
              : t("staffPortal.eventConsole.comunicacion.recipientCount", {
                  count: recipientCount,
                })}
          </Badge>
        </div>
      </div>

      <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("staffPortal.eventConsole.comunicacion.warningTitle")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{t("staffPortal.eventConsole.comunicacion.warningBody")}</p>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={acknowledgedWarning}
              onChange={(e) => setAcknowledgedWarning(e.target.checked)}
            />
            <span>{t("staffPortal.eventConsole.comunicacion.warningAck")}</span>
          </label>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        <div className="card-sport p-4 md:p-5 space-y-4 min-w-0">
          <div className="space-y-2">
            <Label>{t("staffPortal.eventConsole.comunicacion.template")}</Label>
            <Select
              value={templateKey}
              onValueChange={(v) => applyTemplate(v as EventBroadcastTemplateKey)}
              disabled={loadingEventBroadcastTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("staffPortal.eventConsole.comunicacion.template")} />
              </SelectTrigger>
              <SelectContent>
                {eventBroadcastTemplates.map((tpl) => (
                  <SelectItem key={tpl.key} value={tpl.key}>
                    {t(`staffPortal.eventConsole.comunicacion.templates.${tpl.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">
              {t("staffPortal.eventConsole.comunicacion.subject")}
            </Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-preheader">
              {t("staffPortal.eventConsole.comunicacion.preheader")}
            </Label>
            <Input
              id="broadcast-preheader"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("staffPortal.eventConsole.comunicacion.body")}</Label>
            <RichHtmlEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder={t("staffPortal.eventConsole.comunicacion.bodyPlaceholder")}
              className="min-h-[220px]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <Label>{t("staffPortal.eventConsole.comunicacion.sendMode")}</Label>
            <Tabs
              value={sendMode}
              onValueChange={(v) => setSendMode(v as EventBroadcastSendMode)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="now" className="gap-2">
                  <Send className="h-4 w-4" />
                  {t("staffPortal.eventConsole.comunicacion.sendNow")}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-2">
                  <Clock className="h-4 w-4" />
                  {t("staffPortal.eventConsole.comunicacion.sendScheduled")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {sendMode === "scheduled" ? (
              <DateTimePickerField
                value={scheduledAt}
                onChange={setScheduledAt}
                minDate={new Date()}
                minuteStep={15}
                placeholder={t("staffPortal.eventConsole.comunicacion.scheduleAt")}
              />
            ) : null}
          </div>

          {eventBroadcastSendError ? (
            <p className="text-sm text-destructive">{eventBroadcastSendError}</p>
          ) : null}
          {lastEventBroadcastSend &&
          lastEventBroadcastSend.broadcast.status !== "failed" ? (
            <p className="text-sm text-accent">
              {t("staffPortal.eventConsole.comunicacion.sendSuccess", {
                count: lastEventBroadcastSend.recipientCount,
              })}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full gap-2"
            disabled={!canSend || sendingEventBroadcast}
            onClick={() => void handleSend()}
          >
            {sendingEventBroadcast ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            {sendMode === "scheduled"
              ? t("staffPortal.eventConsole.comunicacion.scheduleCta")
              : t("staffPortal.eventConsole.comunicacion.sendCta")}
          </Button>
        </div>

        <div className="card-sport p-4 md:p-5 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">
              {t("staffPortal.eventConsole.comunicacion.preview")}
            </h3>
            {previewingEventBroadcast ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {eventBroadcastPreviewFrom ? (
            <p className="text-xs text-muted-foreground truncate">
              {t("staffPortal.eventConsole.comunicacion.fromLine", {
                from: eventBroadcastPreviewFrom,
              })}
            </p>
          ) : null}
          <div
            className={cn(
              "rounded-xl border border-border overflow-hidden bg-background min-h-[360px]",
              !previewSrcDoc && "flex items-center justify-center text-sm text-muted-foreground",
            )}
          >
            {previewSrcDoc ? (
              <iframe
                title={t("staffPortal.eventConsole.comunicacion.preview")}
                srcDoc={previewSrcDoc}
                className="w-full min-h-[480px] border-0 bg-background"
                sandbox=""
              />
            ) : (
              t("staffPortal.eventConsole.comunicacion.previewEmpty")
            )}
          </div>
        </div>
      </div>

      <div className="card-sport p-4 md:p-5 space-y-4">
        <h3 className="font-semibold">
          {t("staffPortal.eventConsole.comunicacion.history")}
        </h3>
        {loadingEventBroadcasts ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ) : eventBroadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("staffPortal.eventConsole.comunicacion.historyEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {eventBroadcasts.map((row) => (
              <li
                key={row.id}
                className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {localeDate(row.sentAt ?? row.scheduledAt ?? row.createdAt)}
                    {" · "}
                    {t("staffPortal.eventConsole.comunicacion.recipientCount", {
                      count: row.recipientCount,
                    })}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(row.status)}>
                  {t(`staffPortal.eventConsole.comunicacion.status.${row.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
