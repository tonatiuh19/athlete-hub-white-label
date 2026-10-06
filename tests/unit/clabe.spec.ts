import { describe, expect, it } from "vitest";
import {
  bankNameFromClabe,
  clabeLast4,
  isValidClabe,
  normalizeClabe,
} from "../../shared/clabe";

describe("CLABE", () => {
  // Banamex sample with valid control digit: 002010077777777771
  // Compute: use known-good BBVA-style test vector.
  // 012180001234567890 is commonly cited; verify algorithm locally.

  it("normalizes non-digits", () => {
    expect(normalizeClabe("012-180-00123456789-0")).toBe("012180001234567890");
  });

  it("rejects wrong length", () => {
    expect(isValidClabe("01218000123456789")).toBe(false);
    expect(isValidClabe("0121800012345678901")).toBe(false);
  });

  it("validates control digit", () => {
    // Construct a valid CLABE: bank 012 + plaza 180 + account + check
    const base = "01218000123456789";
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += (Number(base[i]) * weights[i]) % 10;
    }
    const check = (10 - (sum % 10)) % 10;
    const valid = base + String(check);
    expect(isValidClabe(valid)).toBe(true);
    expect(isValidClabe(base + String((check + 1) % 10))).toBe(false);
  });

  it("returns last4 and bank name", () => {
    const base = "01218000123456789";
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += (Number(base[i]) * weights[i]) % 10;
    }
    const check = (10 - (sum % 10)) % 10;
    const valid = base + String(check);
    expect(clabeLast4(valid)).toBe(valid.slice(-4));
    expect(bankNameFromClabe(valid)).toBe("BBVA México");
  });
});
