import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import EventCreatePreviewDialog from "@/components/staff/event-create/EventCreatePreviewDialog";
import type { EventCreatePreviewDevice } from "@/components/staff/event-create/types";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";
import { buildEventEditPreviewData } from "@/utils/buildEventEditPreviewData";
import { useInitialEventPreviewScheme } from "@/hooks/use-initial-event-preview-scheme";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "sidebar";
  size?: "default" | "sm" | "lg" | "icon";
  /** Compact icon-only control for narrow mobile headers. */
  iconOnly?: boolean;
};

/**
 * Always-available event page preview (dialog), independent of the edit sticky pane.
 */
export default function EventConsoleVistaPreviaButton({
  className,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: Props) {
  const { t } = useTranslation();
  const eventDetail = useAppSelector((s) => s.staffPortal.eventDetail);
  const event = eventDetail?.event;
  const categories = eventDetail?.categories ?? [];
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<EventCreatePreviewDevice>("desktop");
  const [colorScheme, setColorScheme] = useInitialEventPreviewScheme();

  const buttonVariant =
    variant === "sidebar"
      ? "secondary"
      : variant === "default"
        ? "default"
        : variant;

  const previewData = useMemo(() => {
    if (!event) return null;
    return buildEventEditPreviewData({
      formValues: {
        title: event.title,
        sport_type_id: event.sport_type_id,
        start_date: event.start_date,
        end_date: event.end_date ?? undefined,
        location_city: event.location_city ?? "",
        location_state: event.location_state ?? undefined,
        location_name: event.location_name ?? undefined,
        location_lat:
          event.location_lat != null ? String(event.location_lat) : undefined,
        location_lng:
          event.location_lng != null ? String(event.location_lng) : undefined,
        short_description: event.short_description ?? undefined,
        hero_image_url: event.hero_image_url ?? undefined,
      },
      event,
      categories,
      sportName: event.sport_name ?? undefined,
      organizerName: event.organizer_name ?? undefined,
    });
  }, [event, categories]);

  const label = t("staffPortal.eventConsole.vistaPrevia");

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={iconOnly ? "icon" : size}
        disabled={!previewData}
        className={cn(iconOnly && "h-9 w-9", className)}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <Eye className={cn("w-4 h-4", !iconOnly && "mr-2")} />
        {iconOnly ? null : label}
      </Button>
      {previewData ? (
        <EventCreatePreviewDialog
          open={open}
          onOpenChange={setOpen}
          data={previewData}
          device={device}
          onDeviceChange={setDevice}
          colorScheme={colorScheme}
          onColorSchemeChange={setColorScheme}
        />
      ) : null}
    </>
  );
}
