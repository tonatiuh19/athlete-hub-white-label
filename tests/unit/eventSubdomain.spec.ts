/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  buildEventSubdomainSuggestions,
  isStaleTitleYearAutoSubdomain,
  normalizeEventSubdomain,
  parseEventSubdomainFromHost,
  primaryEventSubdomainFromTitle,
  validateEventSubdomainFormat,
} from "../../shared/eventSubdomain";

describe("eventSubdomain", () => {
  it("normalizes titles to dns labels", () => {
    expect(normalizeEventSubdomain("Cofre de Perote 2026!")).toBe(
      "cofre-de-perote-2026",
    );
  });

  it("rejects reserved and short labels", () => {
    expect(validateEventSubdomainFormat("www")).toBe("reserved");
    expect(validateEventSubdomainFormat("ab")).toBe("too_short");
    expect(validateEventSubdomainFormat("carrera-ok")).toBeNull();
  });

  it("primary from title is name only (no year) when format-valid", () => {
    expect(primaryEventSubdomainFromTitle("endgame")).toBe("endgame");
    expect(primaryEventSubdomainFromTitle("e")).toBeNull();
    expect(primaryEventSubdomainFromTitle("en")).toBeNull();
    expect(primaryEventSubdomainFromTitle("www")).toBeNull();
  });

  it("default suggestions are title-only (no year until alternates requested)", () => {
    const s = buildEventSubdomainSuggestions({
      title: "endgame",
      startDate: "2026-08-01",
      city: "Lagos de Moreno",
    });
    expect(s).toEqual(["endgame"]);
  });

  it("year/city alternates only when includeAlternates", () => {
    const s = buildEventSubdomainSuggestions({
      title: "Avengers Race",
      startDate: "2026-08-01",
      city: "Lagos de Moreno",
      includeAlternates: true,
    });
    expect(s[0]).toBe("avengers-race");
    expect(s).toContain("avengers-race-2026");
    expect(s).toContain("avengers-race-lagos-de-moreno");
  });

  it("never suggests reserved or prefix-blocked labels", () => {
    const s = buildEventSubdomainSuggestions({
      title: "www",
      startDate: "2026-01-01",
      includeAlternates: true,
    });
    expect(s.length).toBeGreaterThanOrEqual(1);
    for (const label of s) {
      expect(validateEventSubdomainFormat(label)).toBeNull();
    }
  });

  it("detects stale year auto from short title prefix", () => {
    expect(isStaleTitleYearAutoSubdomain("e-2026", "endgame")).toBe(true);
    expect(isStaleTitleYearAutoSubdomain("endgame", "endgame")).toBe(false);
    expect(isStaleTitleYearAutoSubdomain("endgame-2026", "other")).toBe(false);
  });

  it("parses event host and ignores apex", () => {
    // Pass apex explicitly so this stays env-independent (deploy may set
    // VITE_PUBLIC_APP_URL to atleita.vercel.app / production hosts).
    expect(parseEventSubdomainFromHost("avengers.atleita.com", "atleita.com")).toBe(
      "avengers",
    );
    expect(parseEventSubdomainFromHost("www.atleita.com", "atleita.com")).toBeNull();
    expect(parseEventSubdomainFromHost("api.atleita.com", "atleita.com")).toBeNull();
    expect(parseEventSubdomainFromHost("carrera.localhost", "localhost")).toBe(
      "carrera",
    );
    expect(
      parseEventSubdomainFromHost("endgame.atleita.vercel.app", "atleita.vercel.app"),
    ).toBe("endgame");
  });
});

