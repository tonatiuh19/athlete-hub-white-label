import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { EventConsoleChromeProvider } from "@/components/staff/event-console/EventConsoleChromeContext";
import { EventConsoleProvider } from "@/components/staff/event-console/EventConsoleContext";
import { EventConsoleNavigationGuardProvider } from "@/components/staff/event-console/EventConsoleNavigationGuardContext";
import EventConsoleSidebar from "@/components/staff/event-console/EventConsoleSidebar";
import { Button } from "@/components/ui/button";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { useAppSelector } from "@/store/hooks";

export default function EventConsoleLayout() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { event } = useEnsureStaffEventDetail(eventId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chromeHostEl, setChromeHostEl] = useState<HTMLElement | null>(null);
  const chromeHostRef = useCallback((node: HTMLDivElement | null) => {
    setChromeHostEl(node);
  }, []);

  const isAdmin = role === "admin";
  const organizerRole =
    user?.type === "organizer" ? user.role : undefined;

  const onToggleMobile = useCallback(() => {
    setMobileOpen((v) => !v);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [eventId]);

  if (!Number.isFinite(eventId)) {
    return <Navigate to="/staff/events" replace />;
  }

  if (!role || (role !== "admin" && role !== "organizer")) {
    return <Navigate to="/staff" replace />;
  }

  return (
    <EventConsoleProvider eventId={eventId}>
      <EventConsoleNavigationGuardProvider>
      <EventConsoleChromeProvider
        hostEl={chromeHostEl}
        mobileMenu={{ open: mobileOpen, onToggle: onToggleMobile }}
      >
        <div className="flex min-h-[calc(100vh-0px)] w-full min-w-0 bg-background">
          <aside className="hidden lg:flex w-[15.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30">
            <EventConsoleSidebar
              eventId={eventId}
              eventTitle={event?.title}
              eventStatus={event?.status}
              isAdmin={isAdmin}
              organizerRole={organizerRole}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col lg:pl-[15.5rem]">
            {/* Pages portal EventConsoleSectionHeader here */}
            <div ref={chromeHostRef} className="sticky top-0 z-20 empty:hidden" />

            {mobileOpen ? (
              <div className="fixed inset-0 z-40 bg-sidebar text-sidebar-foreground lg:hidden">
                <div className="flex h-14 items-center justify-end px-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-sidebar-border bg-transparent"
                    aria-label="Close menu"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <EventConsoleSidebar
                  eventId={eventId}
                  eventTitle={event?.title}
                  eventStatus={event?.status}
                  isAdmin={isAdmin}
                  organizerRole={organizerRole}
                  mobile
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            ) : null}

            <div className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-5 max-w-[1600px] w-full mx-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </EventConsoleChromeProvider>
      </EventConsoleNavigationGuardProvider>
    </EventConsoleProvider>
  );
}
