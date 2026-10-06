import { describe, expect, it, vi } from "vitest";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import {
  ensurePendingSpeiSettlement,
  markSpeiSettlementSent,
  parseConnectChargeMode,
  paymentQualifiesForSpeiSettlement,
} from "../../server/speiSettlements.js";

describe("parseConnectChargeMode", () => {
  it("reads object and JSON string metadata", () => {
    expect(parseConnectChargeMode({ connect_charge_mode: "platform" })).toBe(
      "platform",
    );
    expect(
      parseConnectChargeMode(JSON.stringify({ connect_charge_mode: "destination" })),
    ).toBe("destination");
    expect(parseConnectChargeMode(null)).toBeNull();
    expect(parseConnectChargeMode("{bad")).toBeNull();
  });
});

describe("paymentQualifiesForSpeiSettlement", () => {
  const base = {
    provider: "stripe",
    is_simulation: 0,
    status: "succeeded",
    registration_amount_cents: 50000,
    metadata_json: { connect_charge_mode: "platform" },
  };

  it("accepts platform-mode Stripe successes", () => {
    expect(paymentQualifiesForSpeiSettlement(base)).toBe(true);
  });

  it("rejects manual, simulation, destination, and zero registration amount", () => {
    expect(
      paymentQualifiesForSpeiSettlement({ ...base, provider: "manual" }),
    ).toBe(false);
    expect(
      paymentQualifiesForSpeiSettlement({ ...base, is_simulation: 1 }),
    ).toBe(false);
    expect(
      paymentQualifiesForSpeiSettlement({
        ...base,
        metadata_json: { connect_charge_mode: "destination" },
      }),
    ).toBe(false);
    expect(
      paymentQualifiesForSpeiSettlement({
        ...base,
        registration_amount_cents: 0,
      }),
    ).toBe(false);
    expect(
      paymentQualifiesForSpeiSettlement({ ...base, status: "processing" }),
    ).toBe(false);
  });
});

type QueryResult = [RowDataPacket[] | ResultSetHeader, unknown[]];

function mockDb(handler: (sql: string, params: unknown[]) => QueryResult) {
  return {
    query: vi.fn(async (sql: string, params: unknown[] = []) =>
      handler(sql, params),
    ),
  };
}

describe("ensurePendingSpeiSettlement", () => {
  it("inserts pending row for platform charge (idempotent skip when exists)", async () => {
    let existing = false;
    const db = mockDb((sql, params) => {
      const q = sql.toLowerCase();
      if (q.includes("from payments where id")) {
        return [
          [
            {
              id: Number(params[0]),
              provider: "stripe",
              status: "succeeded",
              is_simulation: 0,
              organizer_id: 10,
              event_id: 20,
              registration_amount_cents: 40000,
              currency: "MXN",
              metadata_json: { connect_charge_mode: "platform" },
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      if (q.includes("from payment_spei_settlements where payment_id")) {
        return [existing ? [{ id: 1 }] as RowDataPacket[] : [], []];
      }
      if (q.includes("from organizer_payout_accounts")) {
        return [[{ id: 99 }] as RowDataPacket[], []];
      }
      if (q.includes("insert into payment_spei_settlements")) {
        existing = true;
        return [
          {
            fieldCount: 0,
            affectedRows: 1,
            insertId: 7,
            info: "",
            serverStatus: 0,
            warningStatus: 0,
            changedRows: 0,
          } as ResultSetHeader,
          [],
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const first = await ensurePendingSpeiSettlement(db as never, 55);
    expect(first).toEqual({ created: true, skipped: false });
    const second = await ensurePendingSpeiSettlement(db as never, 55);
    expect(second).toEqual({
      created: false,
      skipped: true,
      reason: "already_exists",
    });
  });

  it("skips destination charges", async () => {
    const db = mockDb((sql) => {
      if (sql.toLowerCase().includes("from payments where id")) {
        return [
          [
            {
              id: 1,
              provider: "stripe",
              status: "succeeded",
              is_simulation: 0,
              organizer_id: 10,
              event_id: 20,
              registration_amount_cents: 40000,
              currency: "MXN",
              metadata_json: { connect_charge_mode: "destination" },
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const result = await ensurePendingSpeiSettlement(db as never, 1);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("not_platform_stripe");
  });
});

describe("markSpeiSettlementSent", () => {
  it("marks pending settlement sent when account is reveal-eligible", async () => {
    const db = mockDb((sql, params) => {
      const q = sql.toLowerCase();
      if (
        q.includes("from payment_spei_settlements s") &&
        q.includes("where s.id") &&
        !q.includes("join organizers")
      ) {
        return [
          [
            {
              id: Number(params[0]),
              payment_id: 100,
              organizer_id: 10,
              event_id: 20,
              amount_cents: 40000,
              currency: "MXN",
              status: "pending",
              payout_account_id: 99,
              notes: null,
              marked_sent_at: null,
              created_at: "2026-10-05 12:00:00",
              updated_at: "2026-10-05 12:00:00",
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      if (q.includes("from organizer_payout_accounts") && q.includes("status")) {
        return [[{ id: 99, status: "verified" }] as RowDataPacket[], []];
      }
      if (q.includes("update payment_spei_settlements")) {
        return [
          {
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            info: "",
            serverStatus: 0,
            warningStatus: 0,
            changedRows: 1,
          } as ResultSetHeader,
          [],
        ];
      }
      if (q.includes("join organizers")) {
        return [
          [
            {
              id: Number(params[0]),
              payment_id: 100,
              organizer_id: 10,
              organizer_name: "Org",
              event_id: 20,
              event_title: "Race",
              amount_cents: 40000,
              currency: "MXN",
              status: "sent",
              payout_account_id: 99,
              clabe_last4: "6789",
              bank_name: "BBVA",
              notes: "ok",
              marked_sent_at: "2026-10-05 13:00:00",
              created_at: "2026-10-05 12:00:00",
              updated_at: "2026-10-05 13:00:00",
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await markSpeiSettlementSent(db as never, 1, 3, "ok");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settlement.status).toBe("sent");
      expect(result.settlement.clabe_last4).toBe("6789");
    }
  });

  it("rejects when payout account cannot be revealed", async () => {
    const db = mockDb((sql, params) => {
      const q = sql.toLowerCase();
      if (q.includes("from payment_spei_settlements s") && !q.includes("join")) {
        return [
          [
            {
              id: Number(params[0]),
              payment_id: 100,
              organizer_id: 10,
              event_id: 20,
              amount_cents: 40000,
              currency: "MXN",
              status: "pending",
              payout_account_id: 99,
              notes: null,
              marked_sent_at: null,
              created_at: "2026-10-05 12:00:00",
              updated_at: "2026-10-05 12:00:00",
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      if (q.includes("from organizer_payout_accounts")) {
        return [[{ id: 99, status: "draft" }] as RowDataPacket[], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await markSpeiSettlementSent(db as never, 1, 3);
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "CLABE reveal is not available for this payout account",
    });
  });
});
