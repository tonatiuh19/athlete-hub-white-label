import crypto from "crypto";
import { describe, it, expect } from "vitest";
import {
  mapMpPaymentStatusToPlatform,
  mapMpRefundError,
  validateMpWebhookSignature,
} from "../../server/mercadoPago";

describe("validateMpWebhookSignature", () => {
  const secret = "test_webhook_secret";
  const dataId = "999999999";
  const requestId = "req-abc-123";
  const ts = String(Math.floor(Date.now() / 1000));

  function sign(manifestTs: string) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${manifestTs};`;
    return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("accepts a valid signature", () => {
    const hash = sign(ts);
    expect(
      validateMpWebhookSignature({
        xSignature: `ts=${ts},v1=${hash}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(true);
  });

  it("rejects tampered hash", () => {
    expect(
      validateMpWebhookSignature({
        xSignature: `ts=${ts},v1=${"0".repeat(64)}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(false);
  });

  it("rejects stale timestamp", () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 3600);
    const hash = sign(oldTs);
    expect(
      validateMpWebhookSignature({
        xSignature: `ts=${oldTs},v1=${hash}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      validateMpWebhookSignature({
        xSignature: undefined,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(false);
  });

  it("accepts alphanumeric data.id when signed with lowercase manifest", () => {
    const alphaId = "AbCdEf123";
    const lower = alphaId.toLowerCase();
    const manifest = `id:${lower};request-id:${requestId};ts:${ts};`;
    const hash = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");
    expect(
      validateMpWebhookSignature({
        xSignature: `ts=${ts},v1=${hash}`,
        xRequestId: requestId,
        dataId: alphaId,
        secret,
      }),
    ).toBe(true);
  });
});

describe("claimMpWebhookEvent", () => {
  it("returns retry when duplicate exists but processed_at is null", async () => {
    const { claimMpWebhookEvent } = await import("../../server/mercadoPago.js");
    let insertAttempts = 0;
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.startsWith("insert into mercadopago_webhook_events")) {
          insertAttempts += 1;
          if (insertAttempts === 1) {
            const err = new Error("dup") as Error & { code: string };
            err.code = "ER_DUP_ENTRY";
            throw err;
          }
        }
        if (q.includes("select processed_at from mercadopago_webhook_events")) {
          return [[{ processed_at: null }], []];
        }
        throw new Error(`unexpected: ${sql}`);
      },
    };
    await expect(
      claimMpWebhookEvent(pool as never, "evt_1", "payment", "payment.updated", {}),
    ).resolves.toBe("retry");
  });

  it("returns done when already processed", async () => {
    const { claimMpWebhookEvent } = await import("../../server/mercadoPago.js");
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.startsWith("insert into mercadopago_webhook_events")) {
          const err = new Error("dup") as Error & { code: string };
          err.code = "ER_DUP_ENTRY";
          throw err;
        }
        if (q.includes("select processed_at")) {
          return [[{ processed_at: "2026-01-01 00:00:00" }], []];
        }
        throw new Error(`unexpected: ${sql}`);
      },
    };
    await expect(
      claimMpWebhookEvent(pool as never, "evt_2", "payment", null, {}),
    ).resolves.toBe("done");
  });
});

describe("mapMpPaymentStatusToPlatform", () => {
  it("maps approved / pending / terminal", () => {
    expect(mapMpPaymentStatusToPlatform("approved")).toBe("succeeded");
    expect(mapMpPaymentStatusToPlatform("pending")).toBe("processing");
    expect(mapMpPaymentStatusToPlatform("in_process")).toBe("processing");
    expect(mapMpPaymentStatusToPlatform("rejected")).toBe("failed");
    expect(mapMpPaymentStatusToPlatform("cancelled")).toBe("failed");
    expect(mapMpPaymentStatusToPlatform("charged_back")).toBe("failed");
  });
});

describe("mapMpRefundError", () => {
  it("flags insufficient funds style errors", () => {
    const err = mapMpRefundError(
      new Error("Collector has insufficient available_money"),
    );
    expect((err as Error & { code?: string }).code).toBe(
      "mp_refund_insufficient_funds",
    );
  });
});
