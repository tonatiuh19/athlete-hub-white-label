import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  mountStaffPortalScenario,
  teardownStaffPortalScenario,
  STAFF_SCENARIO,
} from "../tests/helpers/staffPortalHarness";
import { staffSeeds } from "../tests/helpers/staffPortalScenarioDb";

describe("HTTP: SPEI settlement queue", () => {
  afterEach(async () => {
    await teardownStaffPortalScenario();
  });

  function seedVerifiedAccount(
    db: Awaited<ReturnType<typeof mountStaffPortalScenario>>["db"],
  ) {
    const id = db.payoutAccountsCtx.nextAccountId++;
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.payoutAccountsCtx.accounts.push({
      id,
      organizer_id: STAFF_SCENARIO.organizerId,
      nickname: "Principal",
      holder_name: "Test Holder",
      clabe_enc: "enc",
      clabe_last4: "4321",
      clabe_hash: "hash",
      bank_name: "BBVA",
      person_type: "persona_fisica",
      legal_name: "Test Legal",
      tax_regime: "612",
      rfc: "XAXX010101000",
      curp: null,
      fiscal_street: "Calle",
      fiscal_ext_number: "1",
      fiscal_int_number: null,
      fiscal_neighborhood: "Centro",
      fiscal_city: "CDMX",
      fiscal_municipality: "Cuauhtémoc",
      fiscal_state: "CDMX",
      fiscal_postal_code: "06000",
      phone: "5512345678",
      invoice_email: "billing@test.local",
      constancia_url: null,
      bank_statement_url: null,
      is_default: 1,
      status: "verified",
      rejection_reason: null,
      locked_at: ts,
      submitted_at: ts,
      verified_at: ts,
      verified_by_admin_id: 1,
      created_at: ts,
      updated_at: ts,
    });
    return id;
  }

  function seedPendingSettlement(
    db: Awaited<ReturnType<typeof mountStaffPortalScenario>>["db"],
    payoutAccountId: number,
  ) {
    const id = db.speiSettlementsCtx.nextId++;
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.speiSettlementsCtx.settlements.push({
      id,
      payment_id: 88001,
      organizer_id: STAFF_SCENARIO.organizerId,
      event_id: STAFF_SCENARIO.defaultEventId,
      amount_cents: 55000,
      currency: "MXN",
      status: "pending",
      payout_account_id: payoutAccountId,
      marked_sent_by_admin_id: null,
      marked_sent_at: null,
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
    return id;
  }

  it("admin lists pending and marks sent", async () => {
    const { app, db, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "admin" },
    );
    const accountId = seedVerifiedAccount(db);
    const settlementId = seedPendingSettlement(db, accountId);

    const listed = await request(app)
      .get("/api/admin/spei-settlements?status=pending")
      .set("Authorization", authHeader);
    expect(listed.status).toBe(200);
    expect(listed.body.pending_total_cents).toBe(55000);
    expect(listed.body.settlements).toHaveLength(1);
    expect(listed.body.settlements[0].clabe_last4).toBe("4321");
    expect(listed.body.settlements[0].organizer_name).toBe("Test Organizer");
    expect(listed.body.settlements[0].payment_id).toBe(88001);

    const marked = await request(app)
      .post(`/api/admin/spei-settlements/${settlementId}/mark-sent`)
      .set("Authorization", authHeader)
      .send({ notes: "SPEI folio 123" });
    expect(marked.status).toBe(200);
    expect(marked.body.settlement.status).toBe("sent");
    expect(marked.body.settlement.notes).toBe("SPEI folio 123");
    expect(marked.body.settlement.clabe_last4).toBe("4321");

    const pendingAfter = await request(app)
      .get("/api/admin/spei-settlements?status=pending")
      .set("Authorization", authHeader);
    expect(pendingAfter.status).toBe(200);
    expect(pendingAfter.body.settlements).toHaveLength(0);
    expect(pendingAfter.body.pending_total_cents).toBe(0);
    expect(pendingAfter.body.sent_total_cents).toBe(55000);
  });

  it("organizer lists own settlements without full CLABE", async () => {
    const { app, db, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "organizer" },
    );
    const accountId = seedVerifiedAccount(db);
    seedPendingSettlement(db, accountId);

    const listed = await request(app)
      .get("/api/organizer/spei-settlements?status=all")
      .set("Authorization", authHeader);
    expect(listed.status).toBe(200);
    expect(listed.body.pending_total_cents).toBe(55000);
    expect(listed.body.settlements).toHaveLength(1);
    expect(listed.body.settlements[0].clabe_last4).toBe("4321");
    expect(listed.body.settlements[0].clabe).toBeUndefined();
    expect(JSON.stringify(listed.body)).not.toMatch(/\d{18}/);
  });

  it("seller cannot list organizer SPEI settlements", async () => {
    const { app, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "organizer", memberId: STAFF_SCENARIO.sellerMemberId },
    );
    const listed = await request(app)
      .get("/api/organizer/spei-settlements")
      .set("Authorization", authHeader);
    expect(listed.status).toBe(403);
  });
});
