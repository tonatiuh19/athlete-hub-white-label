/**
 * Manual organizer payout accounts (Cuenta de Pago / SPEI settlement).
 * CLABE is encrypted at rest; APIs never return the full CLABE.
 */
import crypto from "crypto";
import type { Express, RequestHandler, Response } from "express";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  OrganizerPayoutAccountPublic,
  OrganizerPayoutAccountUpsertRequest,
  OrganizerPayoutPersonType,
} from "../shared/api.js";
import {
  bankNameFromClabe,
  clabeLast4,
  isValidClabe,
  normalizeClabe,
} from "../shared/clabe.js";
import { encryptSecret, decryptSecret } from "./mercadoPago.js";
import type { AuthedRequest } from "./staffPortal.js";

const ACCOUNT_SELECT = `
  id, organizer_id, nickname, holder_name, clabe_last4, bank_name,
  person_type, legal_name, tax_regime, rfc, curp,
  fiscal_street, fiscal_ext_number, fiscal_int_number, fiscal_neighborhood,
  fiscal_city, fiscal_municipality, fiscal_state, fiscal_postal_code,
  phone, invoice_email, constancia_url, bank_statement_url,
  is_default, status, rejection_reason,
  DATE_FORMAT(locked_at, '%Y-%m-%d %H:%i:%s') AS locked_at,
  DATE_FORMAT(submitted_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
  DATE_FORMAT(verified_at, '%Y-%m-%d %H:%i:%s') AS verified_at,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
  DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
`;

type AccountRow = RowDataPacket & {
  id: number;
  organizer_id: number;
  nickname: string;
  holder_name: string;
  clabe_last4: string;
  clabe_enc?: string | null;
  clabe_hash?: string | null;
  bank_name: string | null;
  person_type: OrganizerPayoutPersonType;
  legal_name: string;
  tax_regime: string | null;
  rfc: string | null;
  curp: string | null;
  fiscal_street: string | null;
  fiscal_ext_number: string | null;
  fiscal_int_number: string | null;
  fiscal_neighborhood: string | null;
  fiscal_city: string | null;
  fiscal_municipality: string | null;
  fiscal_state: string | null;
  fiscal_postal_code: string | null;
  phone: string | null;
  invoice_email: string | null;
  constancia_url: string | null;
  bank_statement_url: string | null;
  is_default: number | boolean;
  status: string;
  rejection_reason: string | null;
  locked_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

function hashClabe(normalized: string): string {
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

function rowToPublic(row: AccountRow): OrganizerPayoutAccountPublic {
  return {
    id: Number(row.id),
    organizer_id: Number(row.organizer_id),
    nickname: String(row.nickname),
    holder_name: String(row.holder_name),
    clabe_last4: String(row.clabe_last4),
    bank_name: row.bank_name,
    person_type: row.person_type,
    legal_name: String(row.legal_name),
    tax_regime: row.tax_regime,
    rfc: row.rfc,
    curp: row.curp,
    fiscal_street: row.fiscal_street,
    fiscal_ext_number: row.fiscal_ext_number,
    fiscal_int_number: row.fiscal_int_number,
    fiscal_neighborhood: row.fiscal_neighborhood,
    fiscal_city: row.fiscal_city,
    fiscal_municipality: row.fiscal_municipality,
    fiscal_state: row.fiscal_state,
    fiscal_postal_code: row.fiscal_postal_code,
    phone: row.phone,
    invoice_email: row.invoice_email,
    constancia_url: row.constancia_url,
    bank_statement_url: row.bank_statement_url,
    is_default: Boolean(row.is_default),
    status: row.status as OrganizerPayoutAccountPublic["status"],
    rejection_reason: row.rejection_reason,
    locked_at: row.locked_at,
    submitted_at: row.submitted_at,
    verified_at: row.verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function isLockedStatus(status: string): boolean {
  return status === "submitted" || status === "verified";
}

export async function listAccounts(
  pool: Pool,
  organizerId: number,
): Promise<OrganizerPayoutAccountPublic[]> {
  const [rows] = await pool.query<AccountRow[]>(
    `SELECT ${ACCOUNT_SELECT}
     FROM organizer_payout_accounts
     WHERE organizer_id = ?
     ORDER BY is_default DESC, id DESC`,
    [organizerId],
  );
  return rows.map(rowToPublic);
}

export async function organizerHasVerifiedDefaultPayoutAccount(
  pool: Pool,
  organizerId: number,
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM organizer_payout_accounts
     WHERE organizer_id = ? AND status = 'verified' AND is_default = 1
     LIMIT 1`,
    [organizerId],
  );
  return rows.length > 0;
}

async function loadAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
): Promise<AccountRow | null> {
  const [rows] = await pool.query<AccountRow[]>(
    `SELECT ${ACCOUNT_SELECT}, clabe_enc, clabe_hash
     FROM organizer_payout_accounts
     WHERE id = ? AND organizer_id = ?
     LIMIT 1`,
    [accountId, organizerId],
  );
  return rows[0] ?? null;
}

async function hasVerifiedDefault(
  pool: Pool,
  organizerId: number,
): Promise<boolean> {
  return organizerHasVerifiedDefaultPayoutAccount(pool, organizerId);
}

function validateDraftBody(
  body: OrganizerPayoutAccountUpsertRequest,
  opts?: { requireClabe?: boolean },
): { ok: true; clabe?: string } | { ok: false; error: string } {
  if (body.clabe != null && String(body.clabe).trim()) {
    const clabe = normalizeClabe(String(body.clabe));
    if (!isValidClabe(clabe)) {
      return { ok: false, error: "Invalid CLABE" };
    }
    return { ok: true, clabe };
  }
  if (opts?.requireClabe) {
    return { ok: false, error: "CLABE is required" };
  }
  return { ok: true };
}

function validateSubmitFields(row: {
  nickname: string;
  holder_name: string;
  clabe_last4: string;
  bank_name: string | null;
  person_type: string;
  legal_name: string;
  tax_regime: string | null;
  rfc: string | null;
  curp: string | null;
  fiscal_street: string | null;
  fiscal_ext_number: string | null;
  fiscal_neighborhood: string | null;
  fiscal_city: string | null;
  fiscal_municipality: string | null;
  fiscal_state: string | null;
  fiscal_postal_code: string | null;
  phone: string | null;
  invoice_email: string | null;
  constancia_url: string | null;
  bank_statement_url: string | null;
}): string | null {
  const required: Array<[string, string | null | undefined]> = [
    ["nickname", row.nickname],
    ["holder_name", row.holder_name],
    ["clabe", row.clabe_last4],
    ["bank_name", row.bank_name],
    ["person_type", row.person_type],
    ["legal_name", row.legal_name],
    ["tax_regime", row.tax_regime],
    ["fiscal_street", row.fiscal_street],
    ["fiscal_ext_number", row.fiscal_ext_number],
    ["fiscal_neighborhood", row.fiscal_neighborhood],
    ["fiscal_city", row.fiscal_city],
    ["fiscal_municipality", row.fiscal_municipality],
    ["fiscal_state", row.fiscal_state],
    ["fiscal_postal_code", row.fiscal_postal_code],
    ["phone", row.phone],
    ["invoice_email", row.invoice_email],
    ["rfc", row.rfc],
    ["constancia_url", row.constancia_url],
    ["bank_statement_url", row.bank_statement_url],
  ];
  for (const [key, val] of required) {
    if (!val || !String(val).trim()) {
      return `Missing required field: ${key}`;
    }
  }
  const phoneDigits = String(row.phone).replace(/\D/g, "");
  if (phoneDigits.length !== 10) {
    return "Phone must be 10 digits";
  }
  const email = String(row.invoice_email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid invoice email";
  }
  const rfc = String(row.rfc).trim().toUpperCase();
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    return "Invalid RFC";
  }
  if (row.person_type === "persona_fisica") {
    const curp = String(row.curp ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)) {
      return "CURP is required for persona física";
    }
  }
  const cp = String(row.fiscal_postal_code).replace(/\D/g, "");
  if (cp.length !== 5) {
    return "Postal code must be 5 digits";
  }
  if (!/^https?:\/\//i.test(String(row.constancia_url))) {
    return "Constancia URL is required";
  }
  if (!/^https?:\/\//i.test(String(row.bank_statement_url))) {
    return "Bank statement URL is required";
  }
  return null;
}

export async function createDraftAccount(
  pool: Pool,
  organizerId: number,
  body: OrganizerPayoutAccountUpsertRequest,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  if (await hasVerifiedDefault(pool, organizerId)) {
    return {
      ok: false,
      status: 409,
      error: "A verified default payout account already exists",
    };
  }

  const clabeCheck = validateDraftBody(body, { requireClabe: true });
  if (clabeCheck.ok === false) {
    return { ok: false, status: 400, error: clabeCheck.error };
  }
  const clabe = clabeCheck.clabe!;
  const nickname = trimOrNull(body.nickname);
  const holderName = trimOrNull(body.holder_name);
  const legalName = trimOrNull(body.legal_name);
  const personType = body.person_type;
  if (!nickname || !holderName || !legalName || !personType) {
    return {
      ok: false,
      status: 400,
      error: "nickname, holder_name, legal_name, person_type, and clabe are required",
    };
  }
  if (personType !== "persona_fisica" && personType !== "persona_moral") {
    return { ok: false, status: 400, error: "Invalid person_type" };
  }

  const bankName =
    trimOrNull(body.bank_name) ?? bankNameFromClabe(clabe) ?? "Otro";
  const wantDefault = Boolean(body.is_default);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (wantDefault) {
      await conn.query(
        `UPDATE organizer_payout_accounts SET is_default = 0 WHERE organizer_id = ?`,
        [organizerId],
      );
    }
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO organizer_payout_accounts (
        organizer_id, nickname, holder_name, clabe_enc, clabe_last4, clabe_hash,
        bank_name, person_type, legal_name, tax_regime, rfc, curp,
        fiscal_street, fiscal_ext_number, fiscal_int_number, fiscal_neighborhood,
        fiscal_city, fiscal_municipality, fiscal_state, fiscal_postal_code,
        phone, invoice_email, constancia_url, bank_statement_url, is_default, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'draft')`,
      [
        organizerId,
        nickname,
        holderName,
        encryptSecret(clabe),
        clabeLast4(clabe),
        hashClabe(clabe),
        bankName,
        personType,
        legalName,
        trimOrNull(body.tax_regime),
        trimOrNull(body.rfc)?.toUpperCase() ?? null,
        trimOrNull(body.curp)?.toUpperCase() ?? null,
        trimOrNull(body.fiscal_street),
        trimOrNull(body.fiscal_ext_number),
        trimOrNull(body.fiscal_int_number),
        trimOrNull(body.fiscal_neighborhood),
        trimOrNull(body.fiscal_city),
        trimOrNull(body.fiscal_municipality),
        trimOrNull(body.fiscal_state),
        trimOrNull(body.fiscal_postal_code),
        trimOrNull(body.phone)?.replace(/\D/g, "") ?? null,
        trimOrNull(body.invoice_email),
        trimOrNull(body.constancia_url),
        trimOrNull(body.bank_statement_url),
        wantDefault ? 1 : 0,
      ],
    );
    await conn.commit();
    const created = await loadAccount(pool, organizerId, result.insertId);
    if (!created) {
      return { ok: false, status: 500, error: "Failed to load created account" };
    }
    return { ok: true, account: rowToPublic(created) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateDraftAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
  body: OrganizerPayoutAccountUpsertRequest,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (isLockedStatus(String(existing.status)) || existing.locked_at) {
    return {
      ok: false,
      status: 409,
      error: "Account is locked and cannot be edited",
    };
  }
  if (existing.status === "rejected") {
    // Allow edits on rejected → stays draft-like until resubmit
  } else if (existing.status !== "draft") {
    return { ok: false, status: 409, error: "Only draft accounts can be updated" };
  }

  const clabeCheck = validateDraftBody(body);
  if (clabeCheck.ok === false) {
    return { ok: false, status: 400, error: clabeCheck.error };
  }

  const nickname = trimOrNull(body.nickname) ?? existing.nickname;
  const holderName = trimOrNull(body.holder_name) ?? existing.holder_name;
  const legalName = trimOrNull(body.legal_name) ?? existing.legal_name;
  const personType =
    body.person_type ??
    (existing.person_type as OrganizerPayoutPersonType);

  let clabeEnc: string | undefined;
  let last4: string | undefined;
  let clabeHash: string | undefined;
  let bankName =
    body.bank_name !== undefined
      ? trimOrNull(body.bank_name)
      : existing.bank_name;

  if (clabeCheck.clabe) {
    clabeEnc = encryptSecret(clabeCheck.clabe);
    last4 = clabeLast4(clabeCheck.clabe);
    clabeHash = hashClabe(clabeCheck.clabe);
    if (!bankName) {
      bankName = bankNameFromClabe(clabeCheck.clabe);
    }
  }

  const wantDefault =
    body.is_default !== undefined
      ? Boolean(body.is_default)
      : Boolean(existing.is_default);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (wantDefault) {
      await conn.query(
        `UPDATE organizer_payout_accounts SET is_default = 0 WHERE organizer_id = ? AND id <> ?`,
        [organizerId, accountId],
      );
    }
    await conn.query<ResultSetHeader>(
      `UPDATE organizer_payout_accounts SET
        nickname = ?,
        holder_name = ?,
        clabe_enc = COALESCE(?, clabe_enc),
        clabe_last4 = COALESCE(?, clabe_last4),
        clabe_hash = COALESCE(?, clabe_hash),
        bank_name = ?,
        person_type = ?,
        legal_name = ?,
        tax_regime = ?,
        rfc = ?,
        curp = ?,
        fiscal_street = ?,
        fiscal_ext_number = ?,
        fiscal_int_number = ?,
        fiscal_neighborhood = ?,
        fiscal_city = ?,
        fiscal_municipality = ?,
        fiscal_state = ?,
        fiscal_postal_code = ?,
        phone = ?,
        invoice_email = ?,
        constancia_url = ?,
        bank_statement_url = ?,
        is_default = ?,
        status = CASE WHEN status = 'rejected' THEN 'draft' ELSE status END,
        rejection_reason = CASE WHEN status = 'rejected' THEN NULL ELSE rejection_reason END
       WHERE id = ? AND organizer_id = ?`,
      [
        nickname,
        holderName,
        clabeEnc ?? null,
        last4 ?? null,
        clabeHash ?? null,
        bankName,
        personType,
        legalName,
        body.tax_regime !== undefined
          ? trimOrNull(body.tax_regime)
          : existing.tax_regime,
        body.rfc !== undefined
          ? trimOrNull(body.rfc)?.toUpperCase() ?? null
          : existing.rfc,
        body.curp !== undefined
          ? trimOrNull(body.curp)?.toUpperCase() ?? null
          : existing.curp,
        body.fiscal_street !== undefined
          ? trimOrNull(body.fiscal_street)
          : existing.fiscal_street,
        body.fiscal_ext_number !== undefined
          ? trimOrNull(body.fiscal_ext_number)
          : existing.fiscal_ext_number,
        body.fiscal_int_number !== undefined
          ? trimOrNull(body.fiscal_int_number)
          : existing.fiscal_int_number,
        body.fiscal_neighborhood !== undefined
          ? trimOrNull(body.fiscal_neighborhood)
          : existing.fiscal_neighborhood,
        body.fiscal_city !== undefined
          ? trimOrNull(body.fiscal_city)
          : existing.fiscal_city,
        body.fiscal_municipality !== undefined
          ? trimOrNull(body.fiscal_municipality)
          : existing.fiscal_municipality,
        body.fiscal_state !== undefined
          ? trimOrNull(body.fiscal_state)
          : existing.fiscal_state,
        body.fiscal_postal_code !== undefined
          ? trimOrNull(body.fiscal_postal_code)
          : existing.fiscal_postal_code,
        body.phone !== undefined
          ? trimOrNull(body.phone)?.replace(/\D/g, "") ?? null
          : existing.phone,
        body.invoice_email !== undefined
          ? trimOrNull(body.invoice_email)
          : existing.invoice_email,
        body.constancia_url !== undefined
          ? trimOrNull(body.constancia_url)
          : existing.constancia_url,
        body.bank_statement_url !== undefined
          ? trimOrNull(body.bank_statement_url)
          : existing.bank_statement_url,
        wantDefault ? 1 : 0,
        accountId,
        organizerId,
      ],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await loadAccount(pool, organizerId, accountId);
  if (!updated) {
    return { ok: false, status: 500, error: "Failed to load updated account" };
  }
  return { ok: true, account: rowToPublic(updated) };
}

export async function submitAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
  body?: OrganizerPayoutAccountUpsertRequest,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  if (body && Object.keys(body).length > 0) {
    const updated = await updateDraftAccount(pool, organizerId, accountId, body);
    if (updated.ok === false) return updated;
  }

  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (isLockedStatus(String(existing.status))) {
    return { ok: false, status: 409, error: "Account already submitted" };
  }

  // Ensure CLABE present (encrypted)
  const [encRows] = await pool.query<RowDataPacket[]>(
    `SELECT clabe_enc, clabe_last4, bank_name FROM organizer_payout_accounts
     WHERE id = ? AND organizer_id = ? LIMIT 1`,
    [accountId, organizerId],
  );
  const enc = encRows[0];
  if (!enc?.clabe_enc || !enc.clabe_last4) {
    return { ok: false, status: 400, error: "CLABE is required" };
  }

  const submitErr = validateSubmitFields({
    nickname: existing.nickname,
    holder_name: existing.holder_name,
    clabe_last4: String(enc.clabe_last4),
    bank_name: (enc.bank_name as string | null) ?? existing.bank_name,
    person_type: existing.person_type,
    legal_name: existing.legal_name,
    tax_regime: existing.tax_regime,
    rfc: existing.rfc,
    curp: existing.curp,
    fiscal_street: existing.fiscal_street,
    fiscal_ext_number: existing.fiscal_ext_number,
    fiscal_neighborhood: existing.fiscal_neighborhood,
    fiscal_city: existing.fiscal_city,
    fiscal_municipality: existing.fiscal_municipality,
    fiscal_state: existing.fiscal_state,
    fiscal_postal_code: existing.fiscal_postal_code,
    phone: existing.phone,
    invoice_email: existing.invoice_email,
    constancia_url: existing.constancia_url,
    bank_statement_url: existing.bank_statement_url,
  });
  if (submitErr) {
    return { ok: false, status: 400, error: submitErr };
  }

  await pool.query<ResultSetHeader>(
    `UPDATE organizer_payout_accounts SET
       status = 'submitted',
       submitted_at = NOW(),
       locked_at = NOW(),
       rejection_reason = NULL
     WHERE id = ? AND organizer_id = ?`,
    [accountId, organizerId],
  );

  const submitted = await loadAccount(pool, organizerId, accountId);
  if (!submitted) {
    return { ok: false, status: 500, error: "Failed to load submitted account" };
  }
  return { ok: true, account: rowToPublic(submitted) };
}

export async function setDefaultAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (existing.status !== "verified") {
    return {
      ok: false,
      status: 400,
      error: "Only verified accounts can be set as default",
    };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE organizer_payout_accounts SET is_default = 0 WHERE organizer_id = ?`,
      [organizerId],
    );
    await conn.query(
      `UPDATE organizer_payout_accounts SET is_default = 1 WHERE id = ? AND organizer_id = ?`,
      [accountId, organizerId],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await loadAccount(pool, organizerId, accountId);
  if (!updated) {
    return { ok: false, status: 500, error: "Failed to load account" };
  }
  return { ok: true, account: rowToPublic(updated) };
}

export async function adminVerifyAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
  adminId: number,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (existing.status !== "submitted" && existing.status !== "rejected") {
    return {
      ok: false,
      status: 400,
      error: "Only submitted or rejected accounts can be verified",
    };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE organizer_payout_accounts SET is_default = 0 WHERE organizer_id = ?`,
      [organizerId],
    );
    await conn.query<ResultSetHeader>(
      `UPDATE organizer_payout_accounts SET
         status = 'verified',
         is_default = 1,
         verified_at = NOW(),
         verified_by_admin_id = ?,
         locked_at = COALESCE(locked_at, NOW()),
         rejection_reason = NULL
       WHERE id = ? AND organizer_id = ?`,
      [adminId, accountId, organizerId],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await loadAccount(pool, organizerId, accountId);
  if (!updated) {
    return { ok: false, status: 500, error: "Failed to load account" };
  }
  return { ok: true, account: rowToPublic(updated) };
}

export async function adminRejectAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
  reason?: string | null,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (existing.status !== "submitted") {
    return {
      ok: false,
      status: 400,
      error: "Only submitted accounts can be rejected",
    };
  }

  await pool.query<ResultSetHeader>(
    `UPDATE organizer_payout_accounts SET
       status = 'rejected',
       rejection_reason = ?,
       locked_at = NULL,
       is_default = 0
     WHERE id = ? AND organizer_id = ?`,
    [trimOrNull(reason)?.slice(0, 500) ?? null, accountId, organizerId],
  );

  const updated = await loadAccount(pool, organizerId, accountId);
  if (!updated) {
    return { ok: false, status: 500, error: "Failed to load account" };
  }
  return { ok: true, account: rowToPublic(updated) };
}

/**
 * Admin revoke of a verified Cuenta de Pago (unlocks for organizer edit).
 * Clears default flag so paid events re-gate until a verified default exists again.
 */
export async function adminUnverifyAccount(
  pool: Pool,
  organizerId: number,
  accountId: number,
  reason?: string | null,
): Promise<
  | { ok: true; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (existing.status !== "verified") {
    return {
      ok: false,
      status: 400,
      error: "Only verified accounts can be unverified",
    };
  }

  await pool.query<ResultSetHeader>(
    `UPDATE organizer_payout_accounts SET
       status = 'rejected',
       rejection_reason = ?,
       is_default = 0,
       locked_at = NULL,
       verified_at = NULL,
       verified_by_admin_id = NULL
     WHERE id = ? AND organizer_id = ?`,
    [
      trimOrNull(reason)?.slice(0, 500) ?? "Unverified by Atleita admin",
      accountId,
      organizerId,
    ],
  );

  const updated = await loadAccount(pool, organizerId, accountId);
  if (!updated) {
    return { ok: false, status: 500, error: "Failed to load account" };
  }
  return { ok: true, account: rowToPublic(updated) };
}

/**
 * Admin-only: decrypt full CLABE for SPEI settlement.
 * Allowed for submitted (review) and verified (ops) accounts.
 * Persists a row in organizer_payout_account_clabe_reveals (fail closed if insert fails).
 */
export async function adminRevealClabe(
  pool: Pool,
  organizerId: number,
  accountId: number,
  adminId: number,
): Promise<
  | { ok: true; clabe: string; account: OrganizerPayoutAccountPublic }
  | { ok: false; status: number; error: string }
> {
  const existing = await loadAccount(pool, organizerId, accountId);
  if (!existing) {
    return { ok: false, status: 404, error: "Account not found" };
  }
  if (existing.status !== "submitted" && existing.status !== "verified") {
    return {
      ok: false,
      status: 400,
      error: "CLABE reveal is only allowed for submitted or verified accounts",
    };
  }
  const clabe = decryptSecret(existing.clabe_enc);
  if (!clabe || !isValidClabe(normalizeClabe(clabe))) {
    return { ok: false, status: 500, error: "Could not decrypt CLABE" };
  }
  console.info("[organizerPayoutAccounts] adminRevealClabe", {
    organizerId,
    accountId,
    adminId,
    last4: existing.clabe_last4,
  });
  try {
    await pool.query(
      `INSERT INTO organizer_payout_account_clabe_reveals
         (organizer_id, payout_account_id, admin_id, clabe_last4)
       VALUES (?, ?, ?, ?)`,
      [organizerId, accountId, adminId, existing.clabe_last4],
    );
  } catch (err) {
    console.error("[organizerPayoutAccounts] adminRevealClabe audit insert failed", err);
    return { ok: false, status: 500, error: "Could not audit CLABE reveal" };
  }
  return { ok: true, clabe: normalizeClabe(clabe), account: rowToPublic(existing) };
}

function canManagePayouts(role: string | null): boolean {
  return Boolean(role && ["owner", "finance", "organizer"].includes(role));
}

export interface OrganizerPayoutAccountsRouteDeps {
  pool: Pool;
  requireAdmin: RequestHandler;
  requireOrganizer: RequestHandler;
  getOrganizerMemberRole: (
    pool: Pool,
    memberId: number,
    organizerId: number,
  ) => Promise<string | null>;
  buildStatusResponse?: (organizerId: number) => Promise<unknown>;
}

export function registerOrganizerPayoutAccountRoutes(
  app: Express,
  deps: OrganizerPayoutAccountsRouteDeps,
): void {
  const {
    pool,
    requireAdmin,
    requireOrganizer,
    getOrganizerMemberRole,
    buildStatusResponse,
  } = deps;

  async function assertOrganizerCanManage(
    req: AuthedRequest,
    res: Response,
  ): Promise<number | null> {
    const organizerId = req.auth?.organizerId;
    const memberId = req.auth?.id;
    if (!organizerId || !memberId) {
      res.status(403).json({ error: "Organizer context missing" });
      return null;
    }
    const role = await getOrganizerMemberRole(pool, memberId, organizerId);
    if (!canManagePayouts(role)) {
      res.status(403).json({ error: "Insufficient permissions for payouts" });
      return null;
    }
    return organizerId;
  }

  app.get(
    "/api/organizer/payouts/accounts",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = await assertOrganizerCanManage(req, res);
      if (!organizerId) return;
      const accounts = await listAccounts(pool, organizerId);
      return res.json({ accounts });
    },
  );

  app.post(
    "/api/organizer/payouts/accounts",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = await assertOrganizerCanManage(req, res);
      if (!organizerId) return;
      try {
        const result = await createDraftAccount(
          pool,
          organizerId,
          (req.body ?? {}) as OrganizerPayoutAccountUpsertRequest,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.status(201).json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.status(201).json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] create", err);
        return res.status(500).json({ error: "Could not create payout account" });
      }
    },
  );

  app.patch(
    "/api/organizer/payouts/accounts/:id",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = await assertOrganizerCanManage(req, res);
      if (!organizerId) return;
      const accountId = Number(req.params.id);
      if (!Number.isFinite(accountId)) {
        return res.status(400).json({ error: "Invalid account id" });
      }
      try {
        const result = await updateDraftAccount(
          pool,
          organizerId,
          accountId,
          (req.body ?? {}) as OrganizerPayoutAccountUpsertRequest,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] update", err);
        return res.status(500).json({ error: "Could not update payout account" });
      }
    },
  );

  app.post(
    "/api/organizer/payouts/accounts/:id/submit",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = await assertOrganizerCanManage(req, res);
      if (!organizerId) return;
      const accountId = Number(req.params.id);
      if (!Number.isFinite(accountId)) {
        return res.status(400).json({ error: "Invalid account id" });
      }
      try {
        const result = await submitAccount(
          pool,
          organizerId,
          accountId,
          (req.body ?? {}) as OrganizerPayoutAccountUpsertRequest,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] submit", err);
        return res.status(500).json({ error: "Could not submit payout account" });
      }
    },
  );

  app.post(
    "/api/organizer/payouts/accounts/:id/default",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = await assertOrganizerCanManage(req, res);
      if (!organizerId) return;
      const accountId = Number(req.params.id);
      if (!Number.isFinite(accountId)) {
        return res.status(400).json({ error: "Invalid account id" });
      }
      try {
        const result = await setDefaultAccount(pool, organizerId, accountId);
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] setDefault", err);
        return res.status(500).json({ error: "Could not set default account" });
      }
    },
  );

  app.get(
    "/api/admin/organizers/:organizerId/payout-accounts",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }
      const accounts = await listAccounts(pool, organizerId);
      return res.json({ accounts });
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/payout-accounts/:id/verify",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      const accountId = Number(req.params.id);
      const adminId = req.auth?.id;
      if (!Number.isFinite(organizerId) || !Number.isFinite(accountId) || !adminId) {
        return res.status(400).json({ error: "Invalid ids" });
      }
      try {
        const result = await adminVerifyAccount(
          pool,
          organizerId,
          accountId,
          adminId,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] adminVerify", err);
        return res.status(500).json({ error: "Could not verify account" });
      }
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/payout-accounts/:id/reject",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      const accountId = Number(req.params.id);
      if (!Number.isFinite(organizerId) || !Number.isFinite(accountId)) {
        return res.status(400).json({ error: "Invalid ids" });
      }
      try {
        const result = await adminRejectAccount(
          pool,
          organizerId,
          accountId,
          req.body?.reason ?? req.body?.rejection_reason,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] adminReject", err);
        return res.status(500).json({ error: "Could not reject account" });
      }
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/payout-accounts/:id/reveal-clabe",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      const accountId = Number(req.params.id);
      const adminId = req.auth?.id;
      if (!Number.isFinite(organizerId) || !Number.isFinite(accountId) || !adminId) {
        return res.status(400).json({ error: "Invalid ids" });
      }
      try {
        const result = await adminRevealClabe(pool, organizerId, accountId, adminId);
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        return res.json({ clabe: result.clabe, account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] adminRevealClabe", err);
        return res.status(500).json({ error: "Could not reveal CLABE" });
      }
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/payout-accounts/:id/unverify",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      const accountId = Number(req.params.id);
      if (!Number.isFinite(organizerId) || !Number.isFinite(accountId)) {
        return res.status(400).json({ error: "Invalid ids" });
      }
      try {
        const result = await adminUnverifyAccount(
          pool,
          organizerId,
          accountId,
          req.body?.reason ?? req.body?.rejection_reason,
        );
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        if (buildStatusResponse) {
          const status = await buildStatusResponse(organizerId);
          return res.json({ account: result.account, ...((status as object) ?? {}) });
        }
        return res.json({ account: result.account });
      } catch (err) {
        console.error("[organizerPayoutAccounts] adminUnverify", err);
        return res.status(500).json({ error: "Could not unverify account" });
      }
    },
  );
}
