import { describe, expect, it } from "vitest";
import {
  decodeStaffRoleFromToken,
  isStaffHydrateAuthFailure,
} from "../../app/utils/staffSession.js";

function fakeJwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `hdr.${body}.sig`;
}

describe("staffSession helpers", () => {
  it("decodes admin/organizer actor from JWT", () => {
    expect(decodeStaffRoleFromToken(fakeJwt({ actor: "admin", id: 1 }))).toBe(
      "admin",
    );
    expect(
      decodeStaffRoleFromToken(fakeJwt({ actor: "organizer", id: 2 })),
    ).toBe("organizer");
  });

  it("returns null for athlete or garbage tokens", () => {
    expect(decodeStaffRoleFromToken(fakeJwt({ actor: "athlete" }))).toBeNull();
    expect(decodeStaffRoleFromToken("not-a-jwt")).toBeNull();
    expect(decodeStaffRoleFromToken(null)).toBeNull();
  });

  it("only treats 401/403 as hydrate auth failures", () => {
    expect(isStaffHydrateAuthFailure(401)).toBe(true);
    expect(isStaffHydrateAuthFailure(403)).toBe(true);
    expect(isStaffHydrateAuthFailure(500)).toBe(false);
    expect(isStaffHydrateAuthFailure(undefined)).toBe(false);
    expect(isStaffHydrateAuthFailure(0)).toBe(false);
  });
});

describe("staff session persistence policy", () => {
  it("recovers role from token so a missing role key does not force logout", () => {
    const token = fakeJwt({ actor: "organizer", id: 9, email: "a@b.com" });
    expect(decodeStaffRoleFromToken(token)).toBe("organizer");
  });
});
