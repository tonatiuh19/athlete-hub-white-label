/**
 * Mobile: edge-to-edge registration wizard (more readable than an inset card).
 * Desktop (md+): centered dialog card (overrides applied via Tailwind `max-md` /
 * `md` so they win over base `DialogContent` positioning).
 *
 * Safe-area is handled on the sticky header + Dialog close control (not as
 * content padding), so the top-right X stays visible above the header.
 */
export const REGISTRATION_WIZARD_DIALOG_CONTENT_CLASS =
  [
    "p-0 gap-0 flex flex-col overflow-hidden overflow-x-hidden bg-background border-border",
    // Mobile full-screen
    "max-md:left-0 max-md:top-0 max-md:translate-x-0 max-md:translate-y-0",
    "max-md:w-full max-md:max-w-none max-md:h-[100dvh] max-md:max-h-[100dvh]",
    "max-md:rounded-none max-md:border-0",
    "max-md:pb-[env(safe-area-inset-bottom)]",
    // Desktop card
    "md:w-[min(calc(100vw-2rem),32rem)] md:max-w-lg md:max-h-[min(92dvh,720px)] md:rounded-lg",
  ].join(" ");

/** Sticky wizard chrome. Symmetric horizontal padding so the stepper stays centered;
 * close-button clearance lives only on the title row (`REGISTRATION_WIZARD_TITLE_CLASS`). */
export const REGISTRATION_WIZARD_HEADER_CLASS =
  "sticky top-0 z-10 shrink-0 space-y-3 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 px-4 sm:px-5 pb-3 pt-4 sm:pt-5 text-left max-md:pt-[max(1rem,env(safe-area-inset-top,0px))]";

/** Title block only — reserves space under the Dialog X without skewing the stepper. */
export const REGISTRATION_WIZARD_TITLE_CLASS = "min-w-0 text-left pr-12";
