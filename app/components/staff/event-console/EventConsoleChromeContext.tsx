import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type EventConsoleChromeHost = {
  /** DOM node that hosts the sticky page header. */
  hostEl: HTMLElement | null;
  mobileMenu: {
    open: boolean;
    onToggle: () => void;
  };
};

const EventConsoleChromeContext =
  createContext<EventConsoleChromeHost | null>(null);

export function EventConsoleChromeProvider({
  hostEl,
  mobileMenu,
  children,
}: {
  hostEl: HTMLElement | null;
  mobileMenu: EventConsoleChromeHost["mobileMenu"];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ hostEl, mobileMenu }),
    [hostEl, mobileMenu.open, mobileMenu.onToggle],
  );

  return (
    <EventConsoleChromeContext.Provider value={value}>
      {children}
    </EventConsoleChromeContext.Provider>
  );
}

export function useEventConsoleChromeHost(): EventConsoleChromeHost | null {
  return useContext(EventConsoleChromeContext);
}

/** Portal into the layout chrome slot when available. */
export function EventConsoleChromePortal({
  children,
}: {
  children: ReactNode;
}) {
  const host = useEventConsoleChromeHost();
  if (!host?.hostEl) return null;
  return createPortal(children, host.hostEl);
}
