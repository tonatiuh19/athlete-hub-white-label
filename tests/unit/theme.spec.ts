/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  normalizeTheme,
  shouldUseDarkHtmlClass,
  getStoredTheme,
  explicitRequestTheme,
  getRealmStoredTheme,
  setRealmStoredTheme,
  themeStorageKeyForRealm,
  getTabThemeStorageKey,
  THEME_STORAGE_KEY,
  THEME_STORAGE_KEY_ATHLETE,
  THEME_STORAGE_KEY_STAFF,
} from "@shared/theme";
import {
  nextAppTheme,
  resolveThemeAuthContext,
  resolveInitialThemeForBoot,
} from "@shared/themePreference";

describe("normalizeTheme", () => {
  it("always resolves to light (Atleita is light-only)", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("light");
    expect(normalizeTheme("system")).toBe("light");
    expect(normalizeTheme(null)).toBe("light");
    expect(normalizeTheme("")).toBe("light");
    expect(normalizeTheme("blue")).toBe("light");
  });
});

describe("shouldUseDarkHtmlClass", () => {
  it("never applies dark class", () => {
    expect(shouldUseDarkHtmlClass("light", true)).toBe(false);
    expect(shouldUseDarkHtmlClass("dark", true)).toBe(false);
    expect(shouldUseDarkHtmlClass("system", true)).toBe(false);
    expect(shouldUseDarkHtmlClass(null, true)).toBe(false);
  });
});

describe("getStoredTheme / explicitRequestTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("returns null when unset", () => {
    expect(getStoredTheme()).toBeNull();
    expect(explicitRequestTheme()).toBeUndefined();
  });

  it("normalizes stored dark prefs to light", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("light");
    expect(explicitRequestTheme()).toBe("light");
  });

  it("does not seed register theme from staff preference", () => {
    setRealmStoredTheme("staff", "dark");
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY_ATHLETE);
    expect(explicitRequestTheme()).toBeUndefined();

    setRealmStoredTheme("athlete", "light");
    expect(explicitRequestTheme()).toBe("light");
  });
});

describe("realm theme isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("uses distinct storage keys per realm", () => {
    expect(themeStorageKeyForRealm("guest")).toBe(THEME_STORAGE_KEY);
    expect(themeStorageKeyForRealm("athlete")).toBe(THEME_STORAGE_KEY_ATHLETE);
    expect(themeStorageKeyForRealm("staff")).toBe(THEME_STORAGE_KEY_STAFF);
  });

  it("persists light for both realms even when dark is requested", () => {
    setRealmStoredTheme("athlete", "light");
    setRealmStoredTheme("staff", "dark");
    expect(getRealmStoredTheme("athlete")).toBe("light");
    expect(getRealmStoredTheme("staff")).toBe("light");
  });

  it("falls back to legacy guest key for empty realm", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getRealmStoredTheme("athlete")).toBe("light");
  });

  it("uses tab-scoped next-themes keys (stable within a tab)", () => {
    const a = getTabThemeStorageKey();
    const b = getTabThemeStorageKey();
    expect(a).toBe(b);
    expect(a.startsWith(`${THEME_STORAGE_KEY}:tab:`)).toBe(true);
  });
});

describe("themePreference integration smoke", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves athlete on public when dual session", () => {
    expect(
      resolveThemeAuthContext({
        pathname: "/events",
        athleteToken: "a",
        staffToken: "s",
        staffRole: "organizer",
      }),
    ).toBe("athlete");
    expect(nextAppTheme("dark")).toBe("light");
  });

  it("always boots light regardless of realm prefs", () => {
    setRealmStoredTheme("athlete", "light");
    setRealmStoredTheme("staff", "dark");
    expect(
      resolveInitialThemeForBoot({
        pathname: "/staff/events",
        athleteToken: "a",
        staffToken: "s",
        staffRole: "organizer",
      }),
    ).toBe("light");
    expect(
      resolveInitialThemeForBoot({
        pathname: "/portal",
        athleteToken: "a",
        staffToken: "s",
        staffRole: "organizer",
      }),
    ).toBe("light");
  });
});
