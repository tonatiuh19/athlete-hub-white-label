import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../../server/mercadoPago.js";
import { isValidClabe, normalizeClabe } from "../../shared/clabe.js";

function makeValidClabe(base17: string): string {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (Number(base17[i]) * weights[i]!) % 10;
  }
  const check = (10 - (sum % 10)) % 10;
  return base17 + String(check);
}

describe("admin CLABE reveal crypto", () => {
  const prevKey = process.env.MP_TOKEN_ENCRYPTION_KEY;
  const validClabe = makeValidClabe("01218000123456789");

  beforeEach(() => {
    process.env.MP_TOKEN_ENCRYPTION_KEY = "test-payout-clabe-key-32b!!";
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.MP_TOKEN_ENCRYPTION_KEY;
    else process.env.MP_TOKEN_ENCRYPTION_KEY = prevKey;
  });

  it("encrypts and decrypts a valid CLABE for SPEI reveal", () => {
    expect(isValidClabe(validClabe)).toBe(true);
    const enc = encryptSecret(validClabe);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc.includes(validClabe)).toBe(false);
    const plain = decryptSecret(enc);
    expect(plain).toBe(validClabe);
    expect(isValidClabe(normalizeClabe(plain!))).toBe(true);
  });

  it("returns null for tampered ciphertext", () => {
    const enc = encryptSecret(validClabe);
    const tampered = enc.slice(0, -2) + "aa";
    expect(decryptSecret(tampered)).toBeNull();
  });
});
