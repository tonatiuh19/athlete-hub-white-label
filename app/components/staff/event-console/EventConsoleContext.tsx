import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type EventConsoleContextValue = {
  eventId: number;
  active: true;
};

const EventConsoleContext = createContext<EventConsoleContextValue | null>(
  null,
);

export function EventConsoleProvider({
  eventId,
  children,
}: {
  eventId: number;
  children: ReactNode;
}) {
  return (
    <EventConsoleContext.Provider value={{ eventId, active: true }}>
      {children}
    </EventConsoleContext.Provider>
  );
}

export function useEventConsole(): EventConsoleContextValue | null {
  return useContext(EventConsoleContext);
}

export function useEventConsoleRequired(): EventConsoleContextValue {
  const ctx = useContext(EventConsoleContext);
  if (!ctx) {
    throw new Error("useEventConsoleRequired must be used inside EventConsoleLayout");
  }
  return ctx;
}
