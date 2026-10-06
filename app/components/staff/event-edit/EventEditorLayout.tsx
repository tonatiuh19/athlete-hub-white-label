import type { ReactNode } from "react";
import EventCreateLivePreview from "@/components/staff/event-create/EventCreateLivePreview";
import type { EventCreatePreviewData } from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventEditorLayoutProps {
  header: ReactNode;
  alerts?: ReactNode;
  navMobile?: ReactNode;
  navDesktop?: ReactNode;
  preview: EventCreatePreviewData;
  /** Live preview column — off in event console (Vista previa is in the sidebar). */
  showPreview?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Full-width event editor shell: optional guide | main | optional live preview.
 * Console edit uses main only — preview lives on the sidebar CTA.
 */
export default function EventEditorLayout({
  header,
  alerts,
  navMobile,
  navDesktop,
  preview,
  showPreview = true,
  children,
  className,
}: EventEditorLayoutProps) {
  const hasGuide = Boolean(navDesktop || navMobile);

  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-4 animate-slide-up",
        className,
      )}
    >
      {header}
      {alerts}
      {navMobile}

      <div
        className={cn(
          "grid grid-cols-1 gap-5 items-start w-full",
          showPreview &&
            !hasGuide &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]",
          showPreview &&
            hasGuide &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[13rem_minmax(0,1fr)_minmax(320px,380px)]",
          !showPreview && hasGuide && "xl:grid-cols-[13rem_minmax(0,1fr)]",
        )}
      >
        {navDesktop ? (
          <div className="hidden xl:block min-w-0">{navDesktop}</div>
        ) : null}

        <div className="min-w-0 w-full order-1 xl:order-none">{children}</div>

        {showPreview ? (
          <aside className="hidden lg:block sticky top-4 min-w-0 order-2 xl:order-none">
            <div className="rounded-2xl border border-border bg-card/40 p-2 xl:p-2.5">
              <EventCreateLivePreview data={preview} />
            </div>
          </aside>
        ) : null}
      </div>

      {showPreview ? (
        <div className="lg:hidden rounded-2xl border border-border bg-card/40 p-3">
          <EventCreateLivePreview data={preview} />
        </div>
      ) : null}
    </div>
  );
}
