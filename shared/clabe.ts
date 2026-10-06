/**
 * Mexican CLABE (18 digits) validation — control digit (mod 10 weighted).
 */
const CLABE_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];

export function normalizeClabe(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidClabe(raw: string): boolean {
  const clabe = normalizeClabe(raw);
  if (!/^\d{18}$/.test(clabe)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (Number(clabe[i]) * CLABE_WEIGHTS[i]) % 10;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(clabe[17]);
}

export function clabeLast4(raw: string): string {
  const clabe = normalizeClabe(raw);
  return clabe.slice(-4);
}

/** Common Banxico institution codes → display name (partial map). */
const BANK_BY_CODE: Record<string, string> = {
  "002": "Banamex",
  "012": "BBVA México",
  "014": "Santander",
  "021": "HSBC",
  "030": "Bajío",
  "036": "Inbursa",
  "042": "Mifel",
  "044": "Scotiabank",
  "058": "Banregio",
  "062": "Afirme",
  "072": "Banorte",
  "127": "Azteca",
  "137": "Bancoppel",
  "145": "Banca Mifel",
};

export function bankNameFromClabe(raw: string): string | null {
  const clabe = normalizeClabe(raw);
  if (clabe.length < 3) return null;
  return BANK_BY_CODE[clabe.slice(0, 3)] ?? null;
}

export const MX_TAX_REGIMES_PERSONA_FISICA = [
  { code: "605", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.605" },
  { code: "606", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.606" },
  { code: "608", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.608" },
  { code: "610", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.610" },
  { code: "611", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.611" },
  { code: "612", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.612" },
  { code: "614", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.614" },
  { code: "616", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.616" },
  { code: "621", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.621" },
  { code: "622", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.622" },
  { code: "625", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.625" },
  { code: "626", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.626" },
] as const;

export const MX_TAX_REGIMES_PERSONA_MORAL = [
  { code: "601", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.601" },
  { code: "603", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.603" },
  { code: "620", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.620" },
  { code: "623", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.623" },
  { code: "624", labelKey: "staffPortal.payoutAccounts.taxRegimeCodes.624" },
] as const;
