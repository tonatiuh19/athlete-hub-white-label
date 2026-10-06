import { Monitor } from "lucide-react";
import type { EventCreatePreviewDevice } from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventPreviewDeviceIconProps {
  device: EventCreatePreviewDevice;
  className?: string;
}

/** Distinct silhouettes — Lucide phone/tablet icons look identical at 16px. */
export default function EventPreviewDeviceIcon({
  device,
  className,
}: EventPreviewDeviceIconProps) {
  if (device === "desktop") {
    return <Monitor className={cn("h-4 w-4", className)} strokeWidth={2} aria-hidden />;
  }

  const isPhone = device === "phone";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        isPhone ? "h-[15px] w-[9px]" : "h-[12px] w-[16px]",
        className,
      )}
      aria-hidden
    >
      {isPhone ? (
        <>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <circle cx="12" cy="18" r="0.75" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="19" r="0.75" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
