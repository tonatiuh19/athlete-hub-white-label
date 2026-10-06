import { useState } from "react";
import { resolveApexHostname } from "@/utils/hostContext";
import { useTranslation } from "react-i18next";
import { Expand } from "lucide-react";
import EventPublicPagePreview from "@/components/events/EventPublicPagePreview";
import EventCreatePreviewDialog from "@/components/staff/event-create/EventCreatePreviewDialog";
import { EventPreviewColorSchemeRoot } from "@/components/staff/event-create/EventPreviewColorScheme";
import EventPreviewToolbar from "@/components/staff/event-create/EventPreviewToolbar";
import {
  type EventCreatePreviewData,
  type EventCreatePreviewDevice,
} from "@/components/staff/event-create/types";
import { useInitialEventPreviewScheme } from "@/hooks/use-initial-event-preview-scheme";
import { cn } from "@/lib/utils";

export interface EventCreateLivePreviewProps {
  data: EventCreatePreviewData;
  className?: string;
}

/** Sidebar embed always uses phone width; desktop layout is available in the fullscreen modal. */
const EMBED_DEVICE: EventCreatePreviewDevice = "phone";

export default function EventCreateLivePreview({
  data,
  className,
}: EventCreateLivePreviewProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colorScheme, setColorScheme] = useInitialEventPreviewScheme();
  const [modalDevice, setModalDevice] = useState<EventCreatePreviewDevice>("desktop");

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {t("staffPortal.eventCreate.preview.title")}
            </p>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t("staffPortal.eventCreate.preview.realPageHint")}
            </p>
          </div>
          <EventPreviewToolbar
            device={modalDevice}
            onDeviceChange={setModalDevice}
            colorScheme={colorScheme}
            onColorSchemeChange={setColorScheme}
            showDeviceToggle={false}
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDialogOpen(true);
            }
          }}
          className={cn(
            "group relative w-full rounded-2xl border border-border overflow-hidden text-left cursor-pointer",
            "transition-shadow hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label={t("staffPortal.eventCreate.preview.expand")}
        >
          <EventPreviewColorSchemeRoot
            scheme={colorScheme}
            className="relative max-h-[min(520px,70vh)] overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]"
          >
            <EventPublicPagePreview
              data={data}
              device={EMBED_DEVICE}
              previewMode
              showMobileBar={false}
            />
            <div
              className="sticky bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none"
              aria-hidden
            />
          </EventPreviewColorSchemeRoot>

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 flex items-end justify-center pb-3 pointer-events-none",
            )}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
              <Expand className="h-3.5 w-3.5" />
              {t("staffPortal.eventCreate.preview.expand")}
            </span>
          </div>
        </div>

        {data.subdomain ? (
          <p className="text-[10px] text-center text-muted-foreground font-mono truncate">
            {`${data.subdomain}.${resolveApexHostname()}`}
          </p>
        ) : null}
      </div>

      <EventCreatePreviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={data}
        device={modalDevice}
        onDeviceChange={setModalDevice}
        colorScheme={colorScheme}
        onColorSchemeChange={setColorScheme}
      />
    </>
  );
}
