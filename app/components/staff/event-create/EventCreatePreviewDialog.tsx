import { useTranslation } from "react-i18next";
import { resolveApexHostname } from "@/utils/hostContext";
import { X } from "lucide-react";
import EventPublicPagePreview from "@/components/events/EventPublicPagePreview";
import {
  EventPreviewColorSchemeRoot,
} from "@/components/staff/event-create/EventPreviewColorScheme";
import type { EventPreviewColorScheme } from "@shared/themePreference";
import EventPreviewToolbar from "@/components/staff/event-create/EventPreviewToolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  EventCreatePreviewData,
  EventCreatePreviewDevice,
} from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventCreatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EventCreatePreviewData;
  device: EventCreatePreviewDevice;
  onDeviceChange: (device: EventCreatePreviewDevice) => void;
  colorScheme: EventPreviewColorScheme;
  onColorSchemeChange: (scheme: EventPreviewColorScheme) => void;
}

const DEVICE_WIDTH: Record<EventCreatePreviewDevice, string> = {
  phone: "max-w-[390px]",
  tablet: "max-w-[768px]",
  desktop: "max-w-6xl",
};

export default function EventCreatePreviewDialog({
  open,
  onOpenChange,
  data,
  device,
  onDeviceChange,
  colorScheme,
  onColorSchemeChange,
}: EventCreatePreviewDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-[98vw] w-full h-[96vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 px-4 py-3 border-b border-border bg-card/80 space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-left">
              <DialogTitle className="text-base">
                {t("staffPortal.eventCreate.preview.fullscreenTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t("staffPortal.eventCreate.preview.fullscreenHint")}
                {data.subdomain ? (
                  <span className="block font-mono text-[10px] mt-1 text-muted-foreground">
                    {`${data.subdomain}.${resolveApexHostname()}`}
                  </span>
                ) : null}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EventPreviewToolbar
                device={device}
                onDeviceChange={onDeviceChange}
                colorScheme={colorScheme}
                onColorSchemeChange={onColorSchemeChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "flex-1 min-h-0",
            device === "desktop" ? "overflow-auto" : "overflow-hidden flex flex-col items-stretch",
            "bg-muted/40 p-3 sm:p-6",
          )}
        >
          <EventPreviewColorSchemeRoot
            scheme={colorScheme}
            className={cn(
              "mx-auto w-full rounded-xl border border-border shadow-xl overflow-hidden transition-[max-width] duration-300",
              DEVICE_WIDTH[device],
              device !== "desktop" &&
                "flex flex-col h-[min(820px,calc(96vh-5.5rem))] max-h-[min(820px,calc(96vh-5.5rem))]",
            )}
          >
            <EventPublicPagePreview
              data={data}
              device={device}
              previewMode
              showMobileBar={device !== "desktop"}
            />
          </EventPreviewColorSchemeRoot>
        </div>
      </DialogContent>
    </Dialog>
  );
}
