import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DiscardIntent } from "@/hooks/use-unsaved-changes-guard";

export type EventConsoleNavigationGuardApi = {
  isDirty: boolean;
  requestNavigation: (action: () => void, intent?: DiscardIntent) => void;
};

type RegistrationContextValue = {
  register: (api: EventConsoleNavigationGuardApi | null) => void;
};

const noopGuard: EventConsoleNavigationGuardApi = {
  isDirty: false,
  requestNavigation: (action) => action(),
};

const GuardContext = createContext<EventConsoleNavigationGuardApi>(noopGuard);
const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function EventConsoleNavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [guard, setGuard] = useState<EventConsoleNavigationGuardApi | null>(null);
  const register = useCallback((api: EventConsoleNavigationGuardApi | null) => {
    setGuard(api);
  }, []);
  const registration = useMemo(() => ({ register }), [register]);
  const value = guard ?? noopGuard;

  return (
    <RegistrationContext.Provider value={registration}>
      <GuardContext.Provider value={value}>{children}</GuardContext.Provider>
    </RegistrationContext.Provider>
  );
}

export function useEventConsoleNavigationGuard(): EventConsoleNavigationGuardApi {
  return useContext(GuardContext);
}

/** Event edit (or other console section) registers unsaved navigation guard. */
export function useRegisterEventConsoleNavigationGuard(
  isDirty: boolean,
  requestNavigation: (action: () => void, intent?: DiscardIntent) => void,
) {
  const registration = useContext(RegistrationContext);

  useEffect(() => {
    if (!registration) return;
    registration.register({ isDirty, requestNavigation });
    return () => registration.register(null);
  }, [registration, isDirty, requestNavigation]);
}
