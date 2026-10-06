/**
 * SPEI settlement queue for platform-mode Stripe charges (manual payout rail).
 * Ops SPEIs registration_amount_cents to the organizer's verified Cuenta de Pago.
 * Manual/cash booth sales (provider=manual) are never queued.
 */
import type { Express, RequestHandler, Response } from "express";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  SpeiSettlementListResponse,
  SpeiSettlementRow,
  SpeiSettlementStatus,
} from "../shared/api.js";
import type { AuthedRequest } from "./staffPortal.js";

type Db = Pool | PoolConnection;

const SETTLEMENT_STATUSES = new Set<SpeiSettlementStatus>([
  "pending",
  "sent",
  "cancelled",
]);

export function parseConnectChargeMode(metadataJson: unknown): string | null {
  if (metadataJson == null) return null;
  let obj: Record<string, unknown> | null = null;
  if (typeof metadataJson === "string") {
    try {
      const parsed = JSON.parse(metadataJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (typeof metadataJson === "object" && !Array.isArray(metadataJson)) {
    obj = metadataJson as Record<string, unknown>;
  }
  if (!obj) return null;
  const mode = obj.connect_charge_mode ?? obj.connectChargeMode;
  return typeof mode === "string" ? mode : null;
}

export function paymentQualifiesForSpeiSettlement(pay: {
  provider?: string | null;
  is_simulation?: number | boolean | null;
  status?: string | null;
  registration_amount_cents?: number | null;
  metadata_json?: unknown;
}): boolean {
  if (String(pay.provider ?? "") !== "stripe") return false;
  if (Number(pay.is_simulation ?? 0) === 1) return false;
  if (String(pay.status ?? "") !== "succeeded") return false;
  if (Number(pay.registration_amount_cents ?? 0) <= 0) return false;
  return parseConnectChargeMode(pay.metadata_json) === "platform";
}

async function resolveDefaultVerifiedPayoutAccountId(
  db: Db,
  organizerId: number,
): Promise<number | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM organizer_payout_accounts
     WHERE organizer_id = ? AND status = 'verified' AND is_default = 1
     ORDER BY id ASC LIMIT 1`,
    [organizerId],
  );
  return rows[0]?.id != null ? Number(rows[0].id) : null;
}

/**
 * Idempotent: creates a pending SPEI settlement when a platform-mode Stripe
 * payment succeeds. Safe to call inside the finalize transaction.
 */
export async function ensurePendingSpeiSettlement(
  db: Db,
  paymentId: number,
): Promise<{ created: boolean; skipped: boolean; reason?: string }> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, provider, status, is_simulation, organizer_id, event_id,
            registration_amount_cents, currency, metadata_json
     FROM payments WHERE id = ? LIMIT 1`,
    [paymentId],
  );
  const pay = rows[0] as RowDataPacket | undefined;
  if (!pay) {
    return { created: false, skipped: true, reason: "payment_not_found" };
  }
  if (
    !paymentQualifiesForSpeiSettlement({
      provider: pay.provider as string | null,
      is_simulation: pay.is_simulation as number | boolean | null,
      status: pay.status as string | null,
      registration_amount_cents: Number(pay.registration_amount_cents ?? 0),
      metadata_json: pay.metadata_json,
    })
  ) {
    return { created: false, skipped: true, reason: "not_platform_stripe" };
  }

  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM payment_spei_settlements WHERE payment_id = ? LIMIT 1`,
    [paymentId],
  );
  if (existing.length > 0) {
    return { created: false, skipped: true, reason: "already_exists" };
  }

  const payoutAccountId = await resolveDefaultVerifiedPayoutAccountId(
    db,
    Number(pay.organizer_id),
  );
  const currency =
    typeof pay.currency === "string" && pay.currency.trim()
      ? pay.currency.trim().slice(0, 3).toUpperCase()
      : "MXN";

  try {
    await db.query<ResultSetHeader>(
      `INSERT INTO payment_spei_settlements (
         payment_id, organizer_id, event_id, amount_cents, currency, status, payout_account_id
       ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [
        paymentId,
        Number(pay.organizer_id),
        pay.event_id != null ? Number(pay.event_id) : null,
        Number(pay.registration_amount_cents),
        currency,
        payoutAccountId,
      ],
    );
    return { created: true, skipped: false };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    // Unique payment_id race — treat as idempotent success.
    if (code === "ER_DUP_ENTRY" || code === "ER_DUP_ENTRY_WITH_KEY_NAME") {
      return { created: false, skipped: true, reason: "already_exists" };
    }
    throw err;
  }
}

function mapSettlementRow(row: RowDataPacket): SpeiSettlementRow {
  return {
    id: Number(row.id),
    payment_id: Number(row.payment_id),
    organizer_id: Number(row.organizer_id),
    organizer_name:
      row.organizer_name != null ? String(row.organizer_name) : undefined,
    event_id: row.event_id != null ? Number(row.event_id) : null,
    event_title: row.event_title != null ? String(row.event_title) : null,
    amount_cents: Number(row.amount_cents),
    currency: String(row.currency || "MXN"),
    status: String(row.status) as SpeiSettlementStatus,
    payout_account_id:
      row.payout_account_id != null ? Number(row.payout_account_id) : null,
    clabe_last4: row.clabe_last4 != null ? String(row.clabe_last4) : null,
    bank_name: row.bank_name != null ? String(row.bank_name) : null,
    marked_sent_at:
      row.marked_sent_at != null ? String(row.marked_sent_at) : null,
    notes: row.notes != null ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const LIST_SELECT = `
  s.id, s.payment_id, s.organizer_id, s.event_id, s.amount_cents, s.currency,
  s.status, s.payout_account_id, s.notes,
  DATE_FORMAT(s.marked_sent_at, '%Y-%m-%d %H:%i:%s') AS marked_sent_at,
  DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
  DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
  o.name AS organizer_name,
  e.title AS event_title,
  COALESCE(opa.clabe_last4, opa_default.clabe_last4) AS clabe_last4,
  COALESCE(opa.bank_name, opa_default.bank_name) AS bank_name
`;

const LIST_JOINS = `
  FROM payment_spei_settlements s
  JOIN organizers o ON o.id = s.organizer_id
  LEFT JOIN events e ON e.id = s.event_id
  LEFT JOIN organizer_payout_accounts opa ON opa.id = s.payout_account_id
  LEFT JOIN organizer_payout_accounts opa_default
    ON opa_default.organizer_id = s.organizer_id
   AND opa_default.status = 'verified'
   AND opa_default.is_default = 1
`;

function parseStatusFilter(
  raw: unknown,
): SpeiSettlementStatus | "all" {
  const v = String(raw ?? "pending").toLowerCase();
  if (v === "all") return "all";
  if (SETTLEMENT_STATUSES.has(v as SpeiSettlementStatus)) {
    return v as SpeiSettlementStatus;
  }
  return "pending";
}

async function listSettlements(
  db: Db,
  opts: { organizerId?: number; status: SpeiSettlementStatus | "all" },
): Promise<SpeiSettlementListResponse> {
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.organizerId != null) {
    where.push("s.organizer_id = ?");
    params.push(opts.organizerId);
  }
  if (opts.status !== "all") {
    where.push("s.status = ?");
    params.push(opts.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ${LIST_SELECT}
     ${LIST_JOINS}
     ${whereSql}
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT 500`,
    params,
  );

  const settlements = rows.map(mapSettlementRow);
  const pending_total_cents = settlements
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.amount_cents, 0);
  const sent_total_cents = settlements
    .filter((s) => s.status === "sent")
    .reduce((sum, s) => sum + s.amount_cents, 0);

  // When filtering a single status, still expose accurate totals for the org/admin scope.
  if (opts.status !== "all") {
    const sumParams: unknown[] = [];
    const sumWhere: string[] = [];
    if (opts.organizerId != null) {
      sumWhere.push("organizer_id = ?");
      sumParams.push(opts.organizerId);
    }
    const sumWhereSql = sumWhere.length
      ? `WHERE ${sumWhere.join(" AND ")}`
      : "";
    const [totals] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0) AS pending_total_cents,
         COALESCE(SUM(CASE WHEN status = 'sent' THEN amount_cents ELSE 0 END), 0) AS sent_total_cents
       FROM payment_spei_settlements
       ${sumWhereSql}`,
      sumParams,
    );
    return {
      settlements,
      pending_total_cents: Number(totals[0]?.pending_total_cents ?? 0),
      sent_total_cents: Number(totals[0]?.sent_total_cents ?? 0),
    };
  }

  return { settlements, pending_total_cents, sent_total_cents };
}

/**
 * Mark a pending settlement as sent. Requires a reveal-eligible Cuenta de Pago
 * (submitted or verified) so ops can have obtained the CLABE.
 */
export async function markSpeiSettlementSent(
  db: Db,
  settlementId: number,
  adminId: number,
  notes?: string | null,
): Promise<
  | { ok: true; settlement: SpeiSettlementRow }
  | { ok: false; status: number; error: string }
> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.payment_id, s.organizer_id, s.event_id, s.amount_cents, s.currency,
            s.status, s.payout_account_id, s.notes,
            DATE_FORMAT(s.marked_sent_at, '%Y-%m-%d %H:%i:%s') AS marked_sent_at,
            DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
     FROM payment_spei_settlements s
     WHERE s.id = ? LIMIT 1`,
    [settlementId],
  );
  const row = rows[0];
  if (!row) {
    return { ok: false, status: 404, error: "Settlement not found" };
  }
  if (String(row.status) !== "pending") {
    return {
      ok: false,
      status: 400,
      error: "Only pending settlements can be marked sent",
    };
  }

  let payoutAccountId =
    row.payout_account_id != null ? Number(row.payout_account_id) : null;
  if (payoutAccountId == null) {
    payoutAccountId = await resolveDefaultVerifiedPayoutAccountId(
      db,
      Number(row.organizer_id),
    );
  }

  if (payoutAccountId == null) {
    return {
      ok: false,
      status: 400,
      error: "Organizer has no verified default Cuenta de Pago",
    };
  }

  const [acctRows] = await db.query<RowDataPacket[]>(
    `SELECT id, status FROM organizer_payout_accounts
     WHERE id = ? AND organizer_id = ? LIMIT 1`,
    [payoutAccountId, Number(row.organizer_id)],
  );
  const acct = acctRows[0];
  if (!acct) {
    return { ok: false, status: 400, error: "Payout account not found" };
  }
  // Align with adminRevealClabe eligibility — reveal must already be possible.
  if (acct.status !== "submitted" && acct.status !== "verified") {
    return {
      ok: false,
      status: 400,
      error: "CLABE reveal is not available for this payout account",
    };
  }

  const notesVal =
    notes != null && String(notes).trim()
      ? String(notes).trim().slice(0, 500)
      : null;

  const [upd] = await db.query<ResultSetHeader>(
    `UPDATE payment_spei_settlements SET
       status = 'sent',
       payout_account_id = COALESCE(payout_account_id, ?),
       marked_sent_by_admin_id = ?,
       marked_sent_at = NOW(),
       notes = COALESCE(?, notes)
     WHERE id = ? AND status = 'pending'`,
    [payoutAccountId, adminId, notesVal, settlementId],
  );
  if (upd.affectedRows === 0) {
    return {
      ok: false,
      status: 409,
      error: "Settlement was already updated",
    };
  }

  const [reloaded] = await db.query<RowDataPacket[]>(
    `SELECT ${LIST_SELECT}
     ${LIST_JOINS}
     WHERE s.id = ?
     LIMIT 1`,
    [settlementId],
  );
  if (!reloaded[0]) {
    return { ok: false, status: 500, error: "Failed to load settlement" };
  }
  return { ok: true, settlement: mapSettlementRow(reloaded[0]) };
}

function canManageOrganizerSpei(role: string | null): boolean {
  return Boolean(role && ["owner", "finance", "organizer"].includes(role));
}

export interface SpeiSettlementRouteDeps {
  pool: Pool;
  requireAdmin: RequestHandler;
  requireOrganizer: RequestHandler;
  getOrganizerMemberRole: (
    pool: Pool,
    memberId: number,
    organizerId: number,
  ) => Promise<string | null>;
}

export function registerSpeiSettlementRoutes(
  app: Express,
  deps: SpeiSettlementRouteDeps,
): void {
  const { pool, requireAdmin, requireOrganizer, getOrganizerMemberRole } = deps;

  app.get(
    "/api/admin/spei-settlements",
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const status = parseStatusFilter(req.query.status);
        const payload = await listSettlements(pool, { status });
        return res.json(payload);
      } catch (err) {
        console.error("[speiSettlements] admin list failed", err);
        return res.status(500).json({ error: "Failed to list SPEI settlements" });
      }
    },
  );

  app.post(
    "/api/admin/spei-settlements/:id/mark-sent",
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
          return res.status(400).json({ error: "Invalid settlement id" });
        }
        const adminId = req.auth?.id;
        if (!adminId) {
          return res.status(403).json({ error: "Admin context missing" });
        }
        const notes =
          req.body?.notes != null ? String(req.body.notes) : undefined;
        const result = await markSpeiSettlementSent(pool, id, adminId, notes);
        if (result.ok === false) {
          return res.status(result.status).json({ error: result.error });
        }
        return res.json({ settlement: result.settlement });
      } catch (err) {
        console.error("[speiSettlements] mark-sent failed", err);
        return res.status(500).json({ error: "Failed to mark settlement sent" });
      }
    },
  );

  app.get(
    "/api/organizer/spei-settlements",
    requireOrganizer,
    async (req: AuthedRequest, res: Response) => {
      try {
        const organizerId = req.auth?.organizerId;
        const memberId = req.auth?.id;
        if (!organizerId || !memberId) {
          return res.status(403).json({ error: "Organizer context missing" });
        }
        const role = await getOrganizerMemberRole(pool, memberId, organizerId);
        if (!canManageOrganizerSpei(role)) {
          return res
            .status(403)
            .json({ error: "Insufficient permissions for SPEI settlements" });
        }
        const status = parseStatusFilter(req.query.status);
        const payload = await listSettlements(pool, { organizerId, status });
        return res.json(payload);
      } catch (err) {
        console.error("[speiSettlements] organizer list failed", err);
        return res.status(500).json({ error: "Failed to list SPEI settlements" });
      }
    },
  );
}
