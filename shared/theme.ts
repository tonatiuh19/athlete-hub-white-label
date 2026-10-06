/** App color theme preference (next-themes + DB preferred_theme). */
export type AppTheme = "light" | "dark" | "system";

export type ThemeRealm = "guest" | "athlete" | "staff";

/** Atleita is light-only — dark/system are normalized to light. */
export const DEFAULT_THEME: AppTheme = "light";
export const SUPPORTED_THEMES: AppTheme[] = ["light"];

/**
 * Guest / legacy preference key. Also used as fallback when a realm key is empty.
 * Active tab display theme uses a tab-scoped key (see getTabThemeStorageKey) so
 * athlete + staff sessions in different tabs do not fight via storage events.
 */
export const THEME_STORAGE_KEY = "atleita-theme";
export const THEME_STORAGE_KEY_ATHLETE = "atleita-theme:athlete";
export const THEME_STORAGE_KEY_STAFF = "atleita-theme:staff";

const TAB_ID_SESSION_KEY = "atleita-theme-tab-id";

/** Must match client/lib/api.ts token keys (shared boot script cannot import client). */
export const ATHLETE_TOKEN_STORAGE_KEY = "atleita_athlete_token";
export const STAFF_TOKEN_STORAGE_KEY = "atleita_staff_token";
export const STAFF_ROLE_STORAGE_KEY = "atleita_staff_role";

/** Normalize DB / API / toggle values — Atleita always resolves to light. */
export function normalizeTheme(_input?: string | null): AppTheme {
  return "light";
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark" || value === "system";
}

export function themeStorageKeyForRealm(realm: ThemeRealm): string {
  switch (realm) {
    case "athlete":
      return THEME_STORAGE_KEY_ATHLETE;
    case "staff":
      return THEME_STORAGE_KEY_STAFF;
    default:
      return THEME_STORAGE_KEY;
  }
}

function readStorageTheme(key: string): AppTheme | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(key);
    return stored ? normalizeTheme(stored) : null;
  } catch {
    return null;
  }
}

function writeStorageTheme(key: string, theme: AppTheme): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, normalizeTheme(theme));
  } catch {
    /* private mode / quota */
  }
}

/** Read guest preference (legacy key). null when unset / SSR. */
export function getStoredTheme(): AppTheme | null {
  return readStorageTheme(THEME_STORAGE_KEY);
}

/** Persisted preference for a realm (athlete/staff/guest). Falls back to legacy guest key. */
export function getRealmStoredTheme(realm: ThemeRealm): AppTheme | null {
  const scoped = readStorageTheme(themeStorageKeyForRealm(realm));
  if (scoped) return scoped;
  if (realm !== "guest") return getStoredTheme();
  return null;
}

/** Write realm preference without touching other realms (prevents athlete/staff fights). */
export function setRealmStoredTheme(realm: ThemeRealm, theme: AppTheme): void {
  writeStorageTheme(themeStorageKeyForRealm(realm), normalizeTheme(theme));
  // Keep legacy guest key in sync only for guest toggles / register seeding.
  if (realm === "guest") {
    writeStorageTheme(THEME_STORAGE_KEY, normalizeTheme(theme));
  }
}

/**
 * Per-tab next-themes storage key (id in sessionStorage).
 * Different tabs do not share this key → no cross-tab storage-event theme fights
 * when athlete and staff portals are open side by side.
 */
export function getTabThemeStorageKey(): string {
  if (typeof sessionStorage === "undefined" || typeof localStorage === "undefined") {
    return THEME_STORAGE_KEY;
  }
  try {
    let id = sessionStorage.getItem(TAB_ID_SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(TAB_ID_SESSION_KEY, id);
    }
    return `${THEME_STORAGE_KEY}:tab:${id}`;
  } catch {
    return THEME_STORAGE_KEY;
  }
}

/** Seed tab key once so next-themes initial read matches realm preference. */
export function seedTabThemeStorage(tabKey: string, theme: AppTheme): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!localStorage.getItem(tabKey)) {
      localStorage.setItem(tabKey, normalizeTheme(theme));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Theme to send on auth/register bodies — omit when unset so server default
 * (`system`) can apply without inventing a preference.
 * Prefer athlete realm, then guest. Never use staff console preference for seeding.
 */
export function explicitRequestTheme(): AppTheme | undefined {
  return getRealmStoredTheme("athlete") ?? getStoredTheme() ?? undefined;
}

/** Mirrors index.html pre-hydration theme script — Atleita is light-only. */
export function shouldUseDarkHtmlClass(
  _storedTheme: string | null,
  _prefersDark: boolean,
): boolean {
  return false;
}
