/**
 */
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  mountStaffPortalScenario,
  teardownStaffPortalScenario,
  STAFF_SCENARIO,
} from "../tests/helpers/staffPortalHarness";
import { staffSeeds } from "../tests/helpers/staffPortalScenarioDb";

const OTHER_EVENT_ID = 101;

describe("HTTP smoke: seller event access", () => {
  afterEach(async () => {
    await teardownStaffPortalScenario();
  });

  it("invite seller defaults to events scope and requires event_ids", async () => {
    const { app, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
    );

    const missing = await request(app)
      .post("/api/organizer/members")
      .set("Authorization", authHeader)
      .send({
        email: "booth@test.local",
        first_name: "Booth",
        last_name: "One",
        role: "seller",
      });
    expect(missing.status).toBe(400);
    expect(String(missing.body.error)).toMatch(/event_ids/i);

    const created = await request(app)
      .post("/api/organizer/members")
      .set("Authorization", authHeader)
      .send({
        email: "booth@test.local",
        first_name: "Booth",
        last_name: "One",
        role: "seller",
        event_access_scope: "events",
        event_ids: [STAFF_SCENARIO.defaultEventId],
      });
    expect(created.status).toBe(201);
    const seller = created.body.members.find(
      (m: { email: string }) => m.email === "booth@test.local",
    );
    expect(seller.role).toBe("seller");
    expect(seller.event_access_scope).toBe("events");
    expect(seller.assigned_event_ids).toEqual([STAFF_SCENARIO.defaultEventId]);
  });

  it("invite seller with organization scope can use all events", async () => {
    const { app, authHeader } = await mountStaffPortalScenario(
      staffSeeds.draftWithCategory(),
    );

    const created = await request(app)
      .post("/api/organizer/members")
      .set("Authorization", authHeader)
      .send({
        email: "general-seller@test.local",
        first_name: "General",
        last_name: "Seller",
        role: "seller",
        event_access_scope: "organization",
      });
    expect(created.status).toBe(201);
    const seller = created.body.members.find(
      (m: { email: string }) => m.email === "general-seller@test.local",
    );
    expect(seller.event_access_scope).toBe("organization");
    expect(seller.assigned_event_ids).toEqual([]);
  });

  it("event-scoped seller cannot access unassigned events", async () => {
    const { app, authHeader, db } = await mountStaffPortalScenario(
      {
        ...staffSeeds.draftWithCategory(),
        events: [
          { id: STAFF_SCENARIO.defaultEventId, status: "draft" },
          {
            id: OTHER_EVENT_ID,
            status: "draft",
            slug: "other-event",
            title: "Other Event",
            categories: [{ price_cents: 25000 }],
          },
        ],
      },
      { memberId: STAFF_SCENARIO.sellerMemberId },
    );

    const seller = db.members.find((m) => m.id === STAFF_SCENARIO.sellerMemberId)!;
    seller.event_access_scope = "events";
    db.memberEvents.push({
      organizer_member_id: STAFF_SCENARIO.sellerMemberId,
      event_id: STAFF_SCENARIO.defaultEventId,
    });

    const allowed = await request(app)
      .get(`/api/organizer/events/${STAFF_SCENARIO.defaultEventId}`)
      .set("Authorization", authHeader);
    expect(allowed.status).toBe(200);

    const denied = await request(app)
      .get(`/api/organizer/events/${OTHER_EVENT_ID}`)
      .set("Authorization", authHeader);
    expect(denied.status).toBe(404);
  });

  it("owner can patch seller access between organization and events", async () => {
    const { app, authHeader } = await mountStaffPortalScenario(
      {
        ...staffSeeds.draftWithCategory(),
        events: [
          { id: STAFF_SCENARIO.defaultEventId, status: "draft" },
          {
            id: OTHER_EVENT_ID,
            status: "draft",
            slug: "other-event",
            title: "Other Event",
          },
        ],
      },
    );

    const toEvents = await request(app)
      .patch(`/api/organizer/members/${STAFF_SCENARIO.sellerMemberId}`)
      .set("Authorization", authHeader)
      .send({
        event_access_scope: "events",
        event_ids: [STAFF_SCENARIO.defaultEventId],
      });
    expect(toEvents.status).toBe(200);
    const scoped = toEvents.body.members.find(
      (m: { id: number }) => m.id === STAFF_SCENARIO.sellerMemberId,
    );
    expect(scoped.event_access_scope).toBe("events");
    expect(scoped.assigned_event_ids).toEqual([STAFF_SCENARIO.defaultEventId]);

    const toOrg = await request(app)
      .patch(`/api/organizer/members/${STAFF_SCENARIO.sellerMemberId}`)
      .set("Authorization", authHeader)
      .send({ event_access_scope: "organization" });
    expect(toOrg.status).toBe(200);
    const general = toOrg.body.members.find(
      (m: { id: number }) => m.id === STAFF_SCENARIO.sellerMemberId,
    );
    expect(general.event_access_scope).toBe("organization");
    expect(general.assigned_event_ids).toEqual([]);
  });
});
