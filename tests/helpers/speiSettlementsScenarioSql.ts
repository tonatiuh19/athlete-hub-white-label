import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type SpeiSettlementScenarioRow = {
  id: number;
  payment_id: number;
  organizer_id: number;
  event_id: number | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "sent" | "cancelled";
  payout_account_id: number | null;
  marked_sent_by_admin_id: number | null;
  marked_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export interface SpeiSettlementsSqlContext {
  settlements: SpeiSettlementScenarioRow[];
  nextId: number;
  /** Enrichment hooks provided by StaffPortalScenarioDb. */
  organizerName: (organizerId: number) => string | null;
  eventTitle: (eventId: number) => string | null;
  payoutAccountMeta: (
    organizerId: number,
    payoutAccountId: number | null,
  ) => { clabe_last4: string | null; bank_name: string | null };
}

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

export function createEmptySpeiSettlementsCtx(
  enrich: Omit<SpeiSettlementsSqlContext, "settlements" | "nextId">,
): SpeiSettlementsSqlContext {
  return {
    settlements: [],
    nextId: 5001,
    ...enrich,
  };
}

function enrich(row: SpeiSettlementScenarioRow, ctx: SpeiSettlementsSqlContext) {
  const meta = ctx.payoutAccountMeta(row.organizer_id, row.payout_account_id);
  return {
    ...row,
    organizer_name: ctx.organizerName(row.organizer_id),
    event_title:
      row.event_id != null ? ctx.eventTitle(row.event_id) : null,
    clabe_last4: meta.clabe_last4,
    bank_name: meta.bank_name,
  };
}

export function handleSpeiSettlementsScenarioSql(
  sql: string,
  params: unknown[],
  ctx: SpeiSettlementsSqlContext,
): [RowDataPacket[] | ResultSetHeader, unknown[]] | null {
  const q = sql.toLowerCase().replace(/\s+/g, " ");
  if (!q.includes("payment_spei_settlements")) return null;

  const asRows = (rows: object[]): [RowDataPacket[], unknown[]] => [
    rows as RowDataPacket[],
    [],
  ];

  if (q.includes("insert into payment_spei_settlements")) {
    const id = ctx.nextId++;
    const ts = nowSql();
    ctx.settlements.push({
      id,
      payment_id: Number(params[0]),
      organizer_id: Number(params[1]),
      event_id: params[2] != null ? Number(params[2]) : null,
      amount_cents: Number(params[3]),
      currency: String(params[4] ?? "MXN"),
      status: "pending",
      payout_account_id: params[5] != null ? Number(params[5]) : null,
      marked_sent_by_admin_id: null,
      marked_sent_at: null,
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
    return [header(id, 1), []];
  }

  if (
    q.includes("update payment_spei_settlements set") &&
    q.includes("status = 'sent'")
  ) {
    const payoutAccountId = Number(params[0]);
    const adminId = Number(params[1]);
    const notes = params[2] != null ? String(params[2]) : null;
    const settlementId = Number(params[3]);
    const row = ctx.settlements.find((s) => s.id === settlementId);
    if (!row || row.status !== "pending") {
      return [header(0, 0), []];
    }
    row.status = "sent";
    row.payout_account_id = row.payout_account_id ?? payoutAccountId;
    row.marked_sent_by_admin_id = adminId;
    row.marked_sent_at = nowSql();
    if (notes) row.notes = notes;
    row.updated_at = nowSql();
    return [header(0, 1), []];
  }

  if (q.includes("select id from payment_spei_settlements where payment_id")) {
    const paymentId = Number(params[0]);
    const row = ctx.settlements.find((s) => s.payment_id === paymentId);
    return asRows(row ? [{ id: row.id }] : []);
  }

  if (
    q.includes("coalesce(sum(case when status = 'pending'") &&
    q.includes("from payment_spei_settlements")
  ) {
    let rows = ctx.settlements;
    if (q.includes("organizer_id = ?")) {
      const organizerId = Number(params[0]);
      rows = rows.filter((s) => s.organizer_id === organizerId);
    }
    const pending = rows
      .filter((s) => s.status === "pending")
      .reduce((sum, s) => sum + s.amount_cents, 0);
    const sent = rows
      .filter((s) => s.status === "sent")
      .reduce((sum, s) => sum + s.amount_cents, 0);
    return asRows([{ pending_total_cents: pending, sent_total_cents: sent }]);
  }

  if (q.includes("from payment_spei_settlements s")) {
    let rows = [...ctx.settlements];
    let idx = 0;
    if (q.includes("s.organizer_id = ?")) {
      const organizerId = Number(params[idx++]);
      rows = rows.filter((s) => s.organizer_id === organizerId);
    }
    if (q.includes("s.status = ?")) {
      const status = String(params[idx++]);
      rows = rows.filter((s) => s.status === status);
    }
    if (q.includes("where s.id = ?") || q.includes("and s.id = ?")) {
      // reload-by-id uses WHERE s.id = ? alone; list never uses s.id
      if (q.includes("where s.id = ?")) {
        const id = Number(params[idx++]);
        rows = rows.filter((s) => s.id === id);
      }
    }
    rows.sort((a, b) => b.id - a.id);
    return asRows(rows.map((r) => enrich(r, ctx)));
  }

  return null;
}
