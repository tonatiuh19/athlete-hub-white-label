import type { ReactNode } from "react";
import EventConsoleHeaderFrame from "@/components/staff/event-console/EventConsoleHeaderFrame";
import {
  EventConsoleChromePortal,
  useEventConsoleChromeHost,
} from "@/components/staff/event-console/EventConsoleChromeContext";

export type EventConsoleSectionHeaderProps = {
  title: ReactNode;
  badge?: ReactNode;
  /** Vanity host label without domain, e.g. `endgame`. */
  subdomain?: string | null;
  /** When true, chip opens the public vanity URL. */
  subdomainLive?: boolean;
  actions?: ReactNode;
  status?: ReactNode;
  className?: string;
};

/**
 * Reusable console header: title + status + subdomain + actions + lang/theme.
 * Inside the event console layout it portals into the sticky top slot.
 * Vista previa stays in the sidebar only.
 */
export default function EventConsoleSectionHeader({
  title,
  badge,
  subdomain,
  subdomainLive = false,
  actions,
  status,
  className,
}: EventConsoleSectionHeaderProps) {
  const host = useEventConsoleChromeHost();

  const frame = (
    <EventConsoleHeaderFrame
      sticky={Boolean(host)}
      title={title}
      badge={badge}
      subdomain={subdomain}
      subdomainLive={subdomainLive}
      actions={actions}
      status={status}
      mobileMenu={host?.mobileMenu}
      className={className}
    />
  );

  // Inside console layout: wait for the sticky host node, then portal.
  if (host) {
    if (!host.hostEl) return null;
    return <EventConsoleChromePortal>{frame}</EventConsoleChromePortal>;
  }

  return frame;
}
