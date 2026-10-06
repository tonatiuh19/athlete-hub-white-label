/**
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { encryptSecret } from "../server/mercadoPago.js";
import { isValidClabe } from "../shared/clabe.js";
import {
  mountStaffPortalScenario,
  teardownStaffPortalScenario,
  STAFF_SCENARIO,
} from "../tests/helpers/staffPortalHarness";
import { staffSeeds } from "../tests/helpers/staffPortalScenarioDb";

function makeValidClabe(base17: string): string {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (Number(base17[i]) * weights[i]!) % 10;
  }
  const check = (10 - (sum % 10)) % 10;
  return base17 + String(check);
}

describe("HTTP smoke: admin Cuenta de Pago verify / reject / reveal / unverify", () => {
  const validClabe = makeValidClabe("01218000123456789");
  const prevKey = process.env.MP_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.MP_TOKEN_ENCRYPTION_KEY = "test-payout-clabe-key-32b!!";
    expect(isValidClabe(validClabe)).toBe(true);
  });

  afterEach(async () => {
    await teardownStaffPortalScenario();
    if (prevKey === undefined) delete process.env.MP_TOKEN_ENCRYPTION_KEY;
    else process.env.MP_TOKEN_ENCRYPTION_KEY = prevKey;
  });

  function seedSubmittedAccount(db: Awaited<ReturnType<typeof mountStaffPortalScenario>>["db"]) {
    const id = db.payoutAccountsCtx.nextAccountId++;
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.payoutAccountsCtx.accounts.push({
      id,
      organizer_id: STAFF_SCENARIO.organizerId,
      nickname: "Principal",
      holder_name: "Test Holder",
      clabe_enc: encryptSecret(validClabe),
      clabe_last4: validClabe.slice(-4),
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
      constancia_url: "https://cdn.example/constancia.pdf",
      bank_statement_url: "https://cdn.example/bank.pdf",
      is_default: 0,
      status: "submitted",
      rejection_reason: null,
      locked_at: ts,
      submitted_at: ts,
      verified_at: null,
      verified_by_admin_id: null,
      created_at: ts,
      updated_at: ts,
    });
    return id;
  }

  it("admin verifies, reveals CLABE (audited), then unverifies", async () => {
    const { app, db, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "admin" },
    );
    const accountId = seedSubmittedAccount(db);
    const orgId = STAFF_SCENARIO.organizerId;

    const verified = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${accountId}/verify`)
      .set("Authorization", authHeader);
    expect(verified.status).toBe(200);
    expect(verified.body.account.status).toBe("verified");
    expect(verified.body.account.is_default).toBe(true);
    expect(verified.body.account.clabe_last4).toBe(validClabe.slice(-4));
    expect(verified.body.account.clabe).toBeUndefined();

    const revealed = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${accountId}/reveal-clabe`)
      .set("Authorization", authHeader);
    expect(revealed.status).toBe(200);
    expect(revealed.body.clabe).toBe(validClabe);
    expect(db.payoutAccountsCtx.reveals).toHaveLength(1);
    expect(db.payoutAccountsCtx.reveals[0]?.admin_id).toBe(1);
    expect(db.payoutAccountsCtx.reveals[0]?.clabe_last4).toBe(validClabe.slice(-4));

    const unverified = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${accountId}/unverify`)
      .set("Authorization", authHeader)
      .send({ reason: "Docs expired" });
    expect(unverified.status).toBe(200);
    expect(unverified.body.account.status).toBe("rejected");
    expect(unverified.body.account.is_default).toBe(false);
    expect(unverified.body.account.rejection_reason).toBe("Docs expired");
  });

  it("admin rejects submitted account; reveal blocked on draft", async () => {
    const { app, db, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "admin" },
    );
    const accountId = seedSubmittedAccount(db);
    const orgId = STAFF_SCENARIO.organizerId;

    const rejected = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${accountId}/reject`)
      .set("Authorization", authHeader)
      .send({ reason: "Blurry constancia" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.account.status).toBe("rejected");

    const draftId = db.payoutAccountsCtx.nextAccountId++;
    db.payoutAccountsCtx.accounts.push({
      ...db.payoutAccountsCtx.accounts[0]!,
      id: draftId,
      status: "draft",
      locked_at: null,
      submitted_at: null,
    });

    const revealDraft = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${draftId}/reveal-clabe`)
      .set("Authorization", authHeader);
    expect(revealDraft.status).toBe(400);
  });

  it("organizer JWT cannot call admin payout-account routes", async () => {
    const { app, db, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
      { actor: "organizer" },
    );
    const accountId = seedSubmittedAccount(db);
    const orgId = STAFF_SCENARIO.organizerId;

    const verified = await request(app)
      .post(`/api/admin/organizers/${orgId}/payout-accounts/${accountId}/verify`)
      .set("Authorization", authHeader);
    expect(verified.status).toBe(401);
  });
});
