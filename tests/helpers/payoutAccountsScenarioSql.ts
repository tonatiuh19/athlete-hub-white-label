import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type PayoutAccountScenarioRow = {
  id: number;
  organizer_id: number;
  nickname: string;
  holder_name: string;
  clabe_enc: string;
  clabe_last4: string;
  clabe_hash: string | null;
  bank_name: string | null;
  person_type: string;
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
  is_default: number;
  status: string;
  rejection_reason: string | null;
  locked_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ClabeRevealAuditRow = {
  id: number;
  organizer_id: number;
  payout_account_id: number;
  admin_id: number;
  clabe_last4: string;
  created_at: string;
};

function header(insertId = 0, affectedRows = 1): ResultSetHeader {
  return {
    fieldCount: 0,
    affectedRows,
    insertId,
    info: "",
    serverStatus: 0,
    warningStatus: 0,
    changedRows: 0,
  } as ResultSetHeader;
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export interface PayoutAccountsSqlContext {
  accounts: PayoutAccountScenarioRow[];
  reveals: ClabeRevealAuditRow[];
  nextAccountId: number;
  nextRevealId: number;
}

export function createEmptyPayoutAccountsCtx(): PayoutAccountsSqlContext {
  return { accounts: [], reveals: [], nextAccountId: 9001, nextRevealId: 1 };
}

export function handlePayoutAccountsScenarioSql(
  sql: string,
  params: unknown[],
  ctx: PayoutAccountsSqlContext,
): [RowDataPacket[] | ResultSetHeader, unknown[]] | null {
  const q = sql.toLowerCase().replace(/\s+/g, " ");
  const asRows = (rows: object[]): [RowDataPacket[], unknown[]] => [
    rows as RowDataPacket[],
    [],
  ];

  if (q.includes("insert into organizer_payout_account_clabe_reveals")) {
    const id = ctx.nextRevealId++;
    ctx.reveals.push({
      id,
      organizer_id: Number(params[0]),
      payout_account_id: Number(params[1]),
      admin_id: Number(params[2]),
      clabe_last4: String(params[3]),
      created_at: nowSql(),
    });
    return [header(id, 1), []];
  }

  if (
    q.includes("from organizer_payout_accounts") &&
    q.includes("status = 'verified'") &&
    q.includes("is_default = 1") &&
    q.includes("limit 1")
  ) {
    const organizerId = Number(params[0]);
    const hit = ctx.accounts.find(
      (a) =>
        a.organizer_id === organizerId &&
        a.status === "verified" &&
        a.is_default === 1,
    );
    return hit ? asRows([{ id: hit.id }]) : asRows([]);
  }

  if (
    q.includes("from organizer_payout_accounts") &&
    q.includes("where id = ?") &&
    q.includes("organizer_id = ?")
  ) {
    const id = Number(params[0]);
    const organizerId = Number(params[1]);
    const hit = ctx.accounts.find((a) => a.id === id && a.organizer_id === organizerId);
    return hit ? asRows([hit]) : asRows([]);
  }

  if (
    q.includes("from organizer_payout_accounts") &&
    q.includes("where organizer_id = ?") &&
    q.includes("order by is_default")
  ) {
    const organizerId = Number(params[0]);
    const rows = ctx.accounts
      .filter((a) => a.organizer_id === organizerId)
      .sort((a, b) => b.is_default - a.is_default || b.id - a.id);
    return asRows(rows);
  }

  if (q.includes("insert into organizer_payout_accounts")) {
    const id = ctx.nextAccountId++;
    const ts = nowSql();
    ctx.accounts.push({
      id,
      organizer_id: Number(params[0]),
      nickname: String(params[1]),
      holder_name: String(params[2]),
      clabe_enc: String(params[3]),
      clabe_last4: String(params[4]),
      clabe_hash: (params[5] as string | null) ?? null,
      bank_name: (params[6] as string | null) ?? null,
      person_type: String(params[7]),
      legal_name: String(params[8]),
      tax_regime: (params[9] as string | null) ?? null,
      rfc: (params[10] as string | null) ?? null,
      curp: (params[11] as string | null) ?? null,
      fiscal_street: (params[12] as string | null) ?? null,
      fiscal_ext_number: (params[13] as string | null) ?? null,
      fiscal_int_number: (params[14] as string | null) ?? null,
      fiscal_neighborhood: (params[15] as string | null) ?? null,
      fiscal_city: (params[16] as string | null) ?? null,
      fiscal_municipality: (params[17] as string | null) ?? null,
      fiscal_state: (params[18] as string | null) ?? null,
      fiscal_postal_code: (params[19] as string | null) ?? null,
      phone: (params[20] as string | null) ?? null,
      invoice_email: (params[21] as string | null) ?? null,
      constancia_url: (params[22] as string | null) ?? null,
      bank_statement_url: (params[23] as string | null) ?? null,
      is_default: Number(params[24] ?? 0),
      status: "draft",
      rejection_reason: null,
      locked_at: null,
      submitted_at: null,
      verified_at: null,
      verified_by_admin_id: null,
      created_at: ts,
      updated_at: ts,
    });
    return [header(id, 1), []];
  }

  if (q.includes("update organizer_payout_accounts set is_default = 0 where organizer_id = ?")) {
    const organizerId = Number(params[0]);
    for (const a of ctx.accounts) {
      if (a.organizer_id === organizerId) a.is_default = 0;
    }
    return [header(0, 1), []];
  }

  if (
    q.includes("update organizer_payout_accounts set") &&
    q.includes("status = 'verified'")
  ) {
    const adminId = Number(params[0]);
    const id = Number(params[1]);
    const organizerId = Number(params[2]);
    const a = ctx.accounts.find((row) => row.id === id && row.organizer_id === organizerId);
    if (!a) return [header(0, 0), []];
    a.status = "verified";
    a.is_default = 1;
    a.verified_at = nowSql();
    a.verified_by_admin_id = adminId;
    a.rejection_reason = null;
    a.locked_at = a.locked_at ?? nowSql();
    a.updated_at = nowSql();
    return [header(0, 1), []];
  }

  if (
    q.includes("update organizer_payout_accounts set") &&
    q.includes("status = 'rejected'") &&
    q.includes("verified_at = null")
  ) {
    // unverify
    const reason = (params[0] as string | null) ?? null;
    const id = Number(params[1]);
    const organizerId = Number(params[2]);
    const a = ctx.accounts.find((row) => row.id === id && row.organizer_id === organizerId);
    if (!a) return [header(0, 0), []];
    a.status = "rejected";
    a.rejection_reason = reason;
    a.is_default = 0;
    a.locked_at = null;
    a.verified_at = null;
    a.verified_by_admin_id = null;
    a.updated_at = nowSql();
    return [header(0, 1), []];
  }

  if (
    q.includes("update organizer_payout_accounts set") &&
    q.includes("status = 'rejected'")
  ) {
    const reason = (params[0] as string | null) ?? null;
    const id = Number(params[1]);
    const organizerId = Number(params[2]);
    const a = ctx.accounts.find((row) => row.id === id && row.organizer_id === organizerId);
    if (!a) return [header(0, 0), []];
    a.status = "rejected";
    a.rejection_reason = reason;
    a.locked_at = null;
    a.is_default = 0;
    a.updated_at = nowSql();
    return [header(0, 1), []];
  }

  if (
    q.includes("update organizer_payout_accounts set") &&
    q.includes("status = 'submitted'")
  ) {
    const id = Number(params[params.length - 2]);
    const organizerId = Number(params[params.length - 1]);
    const a = ctx.accounts.find((row) => row.id === id && row.organizer_id === organizerId);
    if (!a) return [header(0, 0), []];
    a.status = "submitted";
    a.submitted_at = nowSql();
    a.locked_at = nowSql();
    a.rejection_reason = null;
    a.updated_at = nowSql();
    return [header(0, 1), []];
  }

  if (q.includes("from organizer_payout_accounts")) {
    return [[], []];
  }

  return null;
}
