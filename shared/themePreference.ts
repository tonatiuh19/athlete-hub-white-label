import {
  getRealmStoredTheme,
  getStoredTheme,
  normalizeTheme,
  setRealmStoredTheme,
  type AppTheme,
  type ThemeRealm,
  ATHLETE_TOKEN_STORAGE_KEY,
  STAFF_TOKEN_STORAGE_KEY,
  STAFF_ROLE_STORAGE_KEY,
  DEFAULT_THEME,
} from "@shared/theme";

export type ThemeAuthContext = ThemeRealm;

export interface ThemeAuthInput {
  pathname: string;
  athleteToken: string | null | undefined;
  staffToken: string | null | undefined;
  staffRole: string | null | undefined;
}

/**
 * Which account owns theme preference for the current route.
 * Public routes prefer athlete when both sessions exist (organizer browsing as athlete).
 * Atleita is light-only — context is retained for storage key compatibility only.
 */
export function resolveThemeAuthContext(input: ThemeAuthInput): ThemeAuthContext {
  const { pathname, athleteToken, staffToken, staffRole } = input;

  if (pathname.startsWith("/staff") || pathname.startsWith("/admin")) {
    return staffToken && staffRole ? "staff" : "guest";
  }

  if (pathname.startsWith("/portal")) {
    return athleteToken ? "athlete" : "guest";
  }

  if (athleteToken) return "athlete";
  if (staffToken && staffRole) return "staff";
  return "guest";
}

/** Boot / index.html: Atleita is light-only. */
export function resolveInitialThemeForBoot(
  _input?: Partial<ThemeAuthInput> & { pathname?: string },
): AppTheme {
  return DEFAULT_THEME;
}

/** Atleita is light-only — cycle is a no-op. */
export function nextAppTheme(
  _current?: AppTheme | string | null | undefined,
): AppTheme {
  return "light";
}

export type EventPreviewColorScheme = "light" | "dark";

/** Athlete-page preview — always light (Atleita has no dark mode). */
export function resolveEventPreviewScheme(
  _resolvedTheme?: string | null | undefined,
): EventPreviewColorScheme {
  return "light";
}

export function readEventPreviewSchemeFromDocument(): EventPreviewColorScheme {
  return "light";
}

export function persistThemeForContext(
  _context: ThemeAuthContext,
  _theme: AppTheme,
): void {
  setRealmStoredTheme("guest", "light");
}

/** Persist + apply helpers used by sync/persistence hooks. */
export {
  setRealmStoredTheme,
  getRealmStoredTheme,
  normalizeTheme,
  getStoredTheme,
};
