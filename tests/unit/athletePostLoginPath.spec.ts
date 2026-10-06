import { describe, expect, it } from "vitest";
import { athletePostLoginPath } from "@/utils/athletePostLoginPath";

describe("athletePostLoginPath", () => {
  it("routes claimToken to portal registrations", () => {
    expect(
      athletePostLoginPath({ search: "?claimToken=abc-123&from=%2Fportal" }),
    ).toBe("/portal/registrations?claimToken=abc-123");
  });

  it("honors from path under /portal when no claim token", () => {
    expect(athletePostLoginPath({ from: "/portal/passes" })).toBe("/portal/passes");
  });

  it("defaults to /portal", () => {
    expect(athletePostLoginPath({})).toBe("/portal");
  });

  it("ignores non-portal from paths", () => {
    expect(athletePostLoginPath({ from: "/events/foo" })).toBe("/portal");
  });
});
