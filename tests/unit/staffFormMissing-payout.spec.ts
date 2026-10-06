import { describe, it, expect } from "vitest";
import { getPayoutProfileMissing } from "../../app/utils/staffFormMissing";

describe("getPayoutProfileMissing", () => {
  it("requires legal name and billing email only (RFC deferred to provider)", () => {
    expect(
      getPayoutProfileMissing({
        legal_name: "",
        billing_email: "",
        rfc: "",
        tax_regime: "",
      }).map((i) => i.id),
    ).toEqual(["legal_name", "billing_email"]);

    expect(
      getPayoutProfileMissing({
        legal_name: "Club X",
        billing_email: "club@example.com",
        rfc: "",
        tax_regime: "",
      }),
    ).toEqual([]);
  });
});
