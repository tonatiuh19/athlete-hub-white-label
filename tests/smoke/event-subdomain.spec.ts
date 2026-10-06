/**
 * @vitest-environment node
 *
 * HTTP smoke: public vanity subdomain available/resolve + create edges.
 */
import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import {
  mountStaffPortalScenario,
  teardownStaffPortalScenario,
  STAFF_SCENARIO,
} from "../helpers/staffPortalHarness";

describe("HTTP smoke: event vanity subdomain", () => {
  afterEach(async () => {
    await teardownStaffPortalScenario();
  });

  it("GET /events/subdomain-available returns taken for live and soft-deleted", async () => {
    const { app } = await mountStaffPortalScenario({
      events: [
        {
          id: 501,
          title: "Live Race",
          slug: "live-race-sub",
          subdomain: "live-race-sub",
          status: "published",
        },
        {
          id: 502,
          title: "Gone Race",
          slug: "gone-race-sub",
          subdomain: "gone-race-sub",
          status: "cancelled",
          deleted_at: new Date().toISOString(),
        },
      ],
    });

    const ok = await request(app).get(
      "/api/events/subdomain-available?subdomain=brand-new-host",
    );
    expect(ok.status).toBe(200);
    expect(ok.body.available).toBe(true);

    const takenLive = await request(app).get(
      "/api/events/subdomain-available?subdomain=live-race-sub",
    );
    expect(takenLive.body.available).toBe(false);
    expect(takenLive.body.error).toBe("taken");

    const takenDeleted = await request(app).get(
      "/api/events/subdomain-available?subdomain=gone-race-sub",
    );
    expect(takenDeleted.body.available).toBe(false);
    expect(takenDeleted.body.error).toBe("taken");

    const reserved = await request(app).get(
      "/api/events/subdomain-available?subdomain=www",
    );
    expect(reserved.body.available).toBe(false);
    expect(reserved.body.error).toBe("reserved");
  });

  it("GET /events/subdomain/:x resolves public/unlisted published only", async () => {
    const { app } = await mountStaffPortalScenario({
      events: [
        {
          id: 601,
          title: "Public Race",
          slug: "public-race-vanity",
          subdomain: "public-race-vanity",
          status: "published",
          visibility: "public",
        },
        {
          id: 602,
          title: "Private Race",
          slug: "private-race-vanity",
          subdomain: "private-race-vanity",
          status: "published",
          visibility: "private",
        },
        {
          id: 603,
          title: "Draft Race",
          slug: "draft-race-vanity",
          subdomain: "draft-race-vanity",
          status: "draft",
          visibility: "public",
        },
        {
          id: 604,
          title: "Unlisted Race",
          slug: "unlisted-race-vanity",
          subdomain: "unlisted-race-vanity",
          status: "published",
          visibility: "unlisted",
        },
      ],
    });

    const pub = await request(app).get(
      "/api/events/subdomain/public-race-vanity",
    );
    expect(pub.status).toBe(200);
    expect(pub.body.slug).toBe("public-race-vanity");
    expect(pub.body.canonical_path).toBe("/events/public-race-vanity");

    const unlisted = await request(app).get(
      "/api/events/subdomain/unlisted-race-vanity",
    );
    expect(unlisted.status).toBe(200);
    expect(unlisted.body.slug).toBe("unlisted-race-vanity");

    const priv = await request(app).get(
      "/api/events/subdomain/private-race-vanity",
    );
    expect(priv.status).toBe(404);
    expect(priv.body.code).toBe("not_live");

    const draft = await request(app).get(
      "/api/events/subdomain/draft-race-vanity",
    );
    expect(draft.status).toBe(404);
    expect(draft.body.code).toBe("not_live");
    expect(draft.body.status).toBe("draft");

    const missing = await request(app).get(
      "/api/events/subdomain/no-such-vanity-host",
    );
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe("not_found");
  });

  it("create without subdomain returns 400", async () => {
    const { app, authHeader } = await mountStaffPortalScenario({ events: [] });

    const res = await request(app)
      .post("/api/organizer/events")
      .set("Authorization", authHeader)
      .send({
        title: "No Subdomain Event",
        sport_type_id: STAFF_SCENARIO.sportTypeId,
        start_date: "2026-10-01T08:00:00",
        visibility: "public",
        requires_waiver: false,
      });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/subdomain/i);
  });

  it("duplicate subdomain on create returns 400", async () => {
    const { app, authHeader } = await mountStaffPortalScenario({
      events: [
        {
          id: 701,
          title: "Existing",
          slug: "existing-vanity-dup",
          subdomain: "existing-vanity-dup",
          status: "draft",
        },
      ],
    });

    const res = await request(app)
      .post("/api/organizer/events")
      .set("Authorization", authHeader)
      .send({
        title: "Clash",
        subdomain: "existing-vanity-dup",
        sport_type_id: STAFF_SCENARIO.sportTypeId,
        start_date: "2026-10-01T08:00:00",
        visibility: "public",
        requires_waiver: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("subdomain already taken");
  });
});
