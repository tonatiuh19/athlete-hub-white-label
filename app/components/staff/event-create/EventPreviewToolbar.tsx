import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventPreviewDeviceIcon from "@/components/staff/event-create/EventPreviewDeviceIcon";
import type { EventPreviewColorScheme } from "@shared/themePreference";
import type { EventCreatePreviewDevice } from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventPreviewToolbarProps {
  device: EventCreatePreviewDevice;
  onDeviceChange: (device: EventCreatePreviewDevice) => void;
  colorScheme: EventPreviewColorScheme;
  onColorSchemeChange: (scheme: EventPreviewColorScheme) => void;
  showDeviceToggle?: boolean;
  className?: string;
}

export default function EventPreviewToolbar({
  device,
  onDeviceChange,
  colorScheme,
  onColorSchemeChange,
  showDeviceToggle = true,
  className,
}: EventPreviewToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("inline-flex items-center gap-1.5 shrink-0", className)}>
      <div
        className="inline-flex rounded-lg border border-border p-0.5 bg-card/80"
        role="group"
        aria-label={t("staffPortal.eventCreate.preview.themeLabel")}
      >
        <Button
          type="button"
          size="sm"
          variant={colorScheme === "light" ? "default" : "ghost"}
          className="h-8 w-8 p-0 rounded-md"
          onClick={() => onColorSchemeChange("light")}
          aria-label={t("staffPortal.eventCreate.preview.themeLight")}
          aria-pressed={colorScheme === "light"}
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={colorScheme === "dark" ? "default" : "ghost"}
          className="h-8 w-8 p-0 rounded-md"
          onClick={() => onColorSchemeChange("dark")}
          aria-label={t("staffPortal.eventCreate.preview.themeDark")}
          aria-pressed={colorScheme === "dark"}
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>

      {showDeviceToggle ? (
        <div
          className="inline-flex rounded-lg border border-border p-0.5 bg-card/80"
          role="group"
          aria-label={t("staffPortal.eventCreate.preview.deviceLabel")}
        >
          {(
            ["phone", "tablet", "desktop"] as const
          ).map((id) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={device === id ? "default" : "ghost"}
              className="h-8 w-8 p-0 rounded-md"
              onClick={() => onDeviceChange(id)}
              aria-label={t(`staffPortal.eventCreate.preview.device.${id}`)}
              aria-pressed={device === id}
            >
              <EventPreviewDeviceIcon device={id} />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
