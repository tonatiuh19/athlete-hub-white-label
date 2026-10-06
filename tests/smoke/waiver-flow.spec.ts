import { describe, it, expect } from "vitest";
import { parseWaiverSignatures, validateWaiverSignaturesForEvent, getRegistrationWaiverStatus } from "../../server/eventWaivers";
import { WAIVER_ACCEPTANCE_SIGNATURE } from "../../shared/waiverConstants";
import {
  FIXTURE_REGISTRATION_ID,
  registrationWaiverStatusPool,
  waiverValidationPool,
} from "../helpers/mockDb";

describe("smoke: waiver signature parsing", () => {
  it("accepts multi-waiver checkbox signatures with version binding", () => {
    const parsed = parseWaiverSignatures({
      waiverSignatures: [
        { waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 2 },
        { waiverId: 2, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 },
      ],
    });
    expect(parsed).toHaveLength(2);
    expect(parsed![0]).toMatchObject({ waiverId: 1, waiverVersion: 2 });
  });

  it("supports snake_case legacy API fields", () => {
    const parsed = parseWaiverSignatures({
      waiverSignatures: [{ waiver_id: 3, waiver_version: 4 }],
    });
    expect(parsed).toEqual([
      { waiverId: 3, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 4 },
    ]);
  });

  it("falls back to legacy single waiverId + waiverSignature", () => {
    const parsed = parseWaiverSignatures({
      waiverId: 9,
      waiverSignature: "Jane Athlete",
    });
    expect(parsed).toEqual([{ waiverId: 9, signature: "Jane Athlete" }]);
  });

  it("rejects empty or invalid signatures", () => {
    expect(parseWaiverSignatures({ waiverSignatures: [] })).toBeNull();
    expect(parseWaiverSignatures({ waiverSignatures: [{ waiverId: 1, signature: "x" }] })).toBeNull();
    expect(parseWaiverSignatures(null)).toBeNull();
  });
});

describe("smoke: waiver validation against active event waivers", () => {
  it("passes when all active waivers are signed at current version", async () => {
    const pool = waiverValidationPool();
    const result = await validateWaiverSignaturesForEvent(pool, 42, [
      { waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 2 },
      { waiverId: 2, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("fails when a required waiver is missing", async () => {
    const pool = waiverValidationPool();
    const result = await validateWaiverSignaturesForEvent(pool, 42, [
      { waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 2 },
    ]);
    expect(result).toEqual({ error: "All waivers must be accepted" });
  });

  it("fails on stale client-bound waiver version (organizer bumped waiver)", async () => {
    const pool = waiverValidationPool();
    const result = await validateWaiverSignaturesForEvent(pool, 42, [
      { waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 },
      { waiverId: 2, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 },
    ]);
    expect(result).toEqual({
      error: "Waiver was updated — please review and accept the latest version",
    });
  });

  it("requires only applicable adult waiver when context is adult", async () => {
    const { createFixturePool } = await import("../helpers/mockDb");
    const pool = createFixturePool([
      {
        match: /FROM event_waivers[\s\S]*is_active = 1/,
        rows: [
          {
            id: 1,
            title: "Adult",
            version: 1,
            audience: "adult",
            category_ids: null,
            sort_order: 0,
          } as import("mysql2/promise").RowDataPacket,
          {
            id: 2,
            title: "Minor",
            version: 1,
            audience: "minor",
            category_ids: null,
            sort_order: 1,
          } as import("mysql2/promise").RowDataPacket,
        ],
      },
    ]);
    const ok = await validateWaiverSignaturesForEvent(
      pool,
      42,
      [{ waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 }],
      {
        categoryId: 10,
        dateOfBirth: "1990-05-01",
        eventStartDate: "2026-11-08",
      },
    );
    expect(ok).toEqual({ ok: true });

    const wrong = await validateWaiverSignaturesForEvent(
      pool,
      42,
      [{ waiverId: 2, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 1 }],
      {
        categoryId: 10,
        dateOfBirth: "1990-05-01",
        eventStartDate: "2026-11-08",
      },
    );
    expect(wrong).toEqual({ error: "All waivers must be accepted" });
  });
});

describe("smoke: registration waiver status (check-in / portal outdated badge)", () => {
  it("returns signed + not outdated when versions match", async () => {
    const pool = registrationWaiverStatusPool({});
    const status = await getRegistrationWaiverStatus(pool, FIXTURE_REGISTRATION_ID);
    expect(status.signed).toBe(true);
    expect(status.outdated).toBe(false);
    expect(status.outdatedWaivers).toHaveLength(0);
  });

  it("flags outdated when organizer published newer waiver version", async () => {
    const pool = registrationWaiverStatusPool({
      signatures: [
        { waiver_id: 1, waiver_version_at_sign: 1 },
        { waiver_id: 2, waiver_version_at_sign: 1 },
      ],
    });
    const status = await getRegistrationWaiverStatus(pool, FIXTURE_REGISTRATION_ID);
    expect(status.outdated).toBe(true);
    expect(status.outdatedWaivers.some((w) => w.waiverId === 1)).toBe(true);
  });

  it("treats waiver as satisfied when event does not require waiver", async () => {
    const pool = registrationWaiverStatusPool({ requiresWaiver: false, waiverSignedAt: null });
    const status = await getRegistrationWaiverStatus(pool, FIXTURE_REGISTRATION_ID);
    expect(status).toEqual({ signed: true, outdated: false, outdatedWaivers: [] });
  });

  it("detects unsigned registration when requires waiver but no signatures", async () => {
    const pool = registrationWaiverStatusPool({
      waiverSignedAt: null,
      signatures: [],
    });
    const status = await getRegistrationWaiverStatus(pool, FIXTURE_REGISTRATION_ID);
    expect(status.signed).toBe(false);
    expect(status.outdated).toBe(true);
  });

  it("ignores non-applicable minor waiver when registrant is adult", async () => {
    const { createFixturePool, FIXTURE_EVENT_ID, FIXTURE_REGISTRATION_ID } = await import(
      "../helpers/mockDb"
    );
    const pool = createFixturePool([
      {
        match: /FROM registrations r[\s\S]*JOIN events e/,
        rows: [
          {
            event_id: FIXTURE_EVENT_ID,
            event_category_id: 10,
            waiver_signed_at: "2026-01-01T00:00:00.000Z",
            requires_waiver: 1,
            start_date: "2026-11-08",
            date_of_birth: "1990-01-15",
          } as import("mysql2/promise").RowDataPacket,
        ],
      },
      {
        match: /FROM event_waivers[\s\S]*is_active = 1/,
        rows: [
          {
            id: 1,
            title: "Adult",
            version: 1,
            audience: "adult",
            category_ids: null,
            sort_order: 0,
          } as import("mysql2/promise").RowDataPacket,
          {
            id: 2,
            title: "Minor",
            version: 1,
            audience: "minor",
            category_ids: null,
            sort_order: 1,
          } as import("mysql2/promise").RowDataPacket,
        ],
      },
      {
        match: /FROM registration_waiver_signatures/,
        rows: [
          { waiver_id: 1, waiver_version_at_sign: 1 } as import("mysql2/promise").RowDataPacket,
        ],
      },
    ]);
    const status = await getRegistrationWaiverStatus(pool, FIXTURE_REGISTRATION_ID);
    expect(status.outdated).toBe(false);
    expect(status.signed).toBe(true);
  });
});
