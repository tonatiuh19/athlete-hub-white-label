import { describe, expect, it } from "vitest";
import {
  nextAppTheme,
  resolveEventPreviewScheme,
  resolveThemeAuthContext,
} from "@shared/themePreference";

describe("resolveThemeAuthContext", () => {
  const both = {
    athleteToken: "a",
    staffToken: "s",
    staffRole: "organizer" as const,
  };

  it("uses staff on staff routes", () => {
    expect(
      resolveThemeAuthContext({ pathname: "/staff/events", ...both }),
    ).toBe("staff");
    expect(
      resolveThemeAuthContext({ pathname: "/admin/settings", ...both }),
    ).toBe("staff");
  });

  it("uses athlete on portal routes", () => {
    expect(
      resolveThemeAuthContext({ pathname: "/portal/registrations", ...both }),
    ).toBe("athlete");
  });

  it("prefers athlete on public routes when both sessions exist", () => {
    expect(resolveThemeAuthContext({ pathname: "/events", ...both })).toBe(
      "athlete",
    );
    expect(resolveThemeAuthContext({ pathname: "/", ...both })).toBe("athlete");
  });

  it("returns guest without tokens", () => {
    expect(
      resolveThemeAuthContext({
        pathname: "/events",
        athleteToken: null,
        staffToken: null,
        staffRole: null,
      }),
    ).toBe("guest");
  });

  it("uses staff alone on public routes", () => {
    expect(
      resolveThemeAuthContext({
        pathname: "/",
        athleteToken: null,
        staffToken: "s",
        staffRole: "admin",
      }),
    ).toBe("staff");
  });

  it("keeps dual-session public routes on athlete (staff theme must not win)", () => {
    expect(
      resolveThemeAuthContext({
        pathname: "/events/foo",
        athleteToken: "athlete",
        staffToken: "staff",
        staffRole: "organizer",
      }),
    ).toBe("athlete");
    expect(
      resolveThemeAuthContext({
        pathname: "/staff/events",
        athleteToken: "athlete",
        staffToken: "staff",
        staffRole: "organizer",
      }),
    ).toBe("staff");
  });
});

describe("nextAppTheme", () => {
  it("is a no-op — always light", () => {
    expect(nextAppTheme("light")).toBe("light");
    expect(nextAppTheme("dark")).toBe("light");
    expect(nextAppTheme("system")).toBe("light");
  });
});

describe("resolveEventPreviewScheme", () => {
  it("always returns light (Atleita has no dark mode)", () => {
    expect(resolveEventPreviewScheme("dark")).toBe("light");
    expect(resolveEventPreviewScheme("light")).toBe("light");
    expect(resolveEventPreviewScheme("system")).toBe("light");
    expect(resolveEventPreviewScheme(undefined)).toBe("light");
  });
});
