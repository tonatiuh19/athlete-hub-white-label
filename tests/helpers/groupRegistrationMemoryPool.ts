import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { SCENARIO } from "./scenarioDb";

export type MemoryAthlete = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  deleted_at: string | null;
  status: string;
  preferred_language?: string;
};

export type MemoryRegistration = {
  id: number;
  event_id: number;
  athlete_id: number;
  event_category_id: number;
  status: string;
  deleted_at: string | null;
  guest_claim_token: string | null;
  registration_number: string;
  public_uuid: string;
};

export type GroupMemorySeed = {
  eventId?: number;
  categoryId?: number;
  categoryCapacity?: number | null;
  categorySoldCount?: number;
  eventStartDate?: string;
  requiresWaiver?: boolean;
  maxPerOrder?: number;
  athletes?: MemoryAthlete[];
  registrations?: MemoryRegistration[];
};

function header(insertId = 0, affectedRows = 1): ResultSetHeader {
  return { insertId, affectedRows } as ResultSetHeader;
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

export class GroupRegistrationMemoryPool {
  readonly eventId: number;
  readonly categoryId: number;
  readonly eventStartDate: string;
  readonly requiresWaiver: boolean;
  readonly maxPerOrder: number;
  readonly waivers: Array<{ id: number; title: string; version: number }>;
  readonly waiverSignatures: Array<{
    registration_id: number;
    waiver_id: number;
    waiver_version_at_sign: number;
    ip_address: string | null;
    signature_data: string | null;
    signed_at: string;
    acceptance_pdf_url: string | null;
  }> = [];

  category: {
    id: number;
    name: string;
    price_cents: number;
    capacity: number;
    currency: string;
    waitlist_enabled: number;
    min_age: null;
    max_age: null;
    gender_restriction: string;
    sold_count: number;
    event_id: number;
    is_active: number;
  } = {
    id: 0,
    name: "10K Elite",
    price_cents: 0,
    capacity: 100,
    currency: "MXN",
    waitlist_enabled: 0,
    min_age: null,
    max_age: null,
    gender_restriction: "any",
    sold_count: 0,
    event_id: 0,
    is_active: 1,
  };

  athletes = new Map<number, MemoryAthlete>();
  registrations: MemoryRegistration[] = [];
  private nextAthleteId = 2000;
  private nextRegistrationId = 8000;

  constructor(seed: GroupMemorySeed = {}) {
    this.eventId = seed.eventId ?? SCENARIO.eventId;
    this.categoryId = seed.categoryId ?? SCENARIO.categoryId;
    this.eventStartDate = seed.eventStartDate ?? "2026-12-01";
    this.requiresWaiver = seed.requiresWaiver ?? false;
    this.waivers = this.requiresWaiver ? [{ id: 1, title: "Waiver", version: 1 }] : [];
    this.maxPerOrder = seed.maxPerOrder ?? 10;
    this.category.id = this.categoryId;
    this.category.event_id = this.eventId;
    this.category.capacity = seed.categoryCapacity ?? 100;
    this.category.sold_count = seed.categorySoldCount ?? 0;

    const defaults: MemoryAthlete[] = seed.athletes ?? [
      {
        id: SCENARIO.athleteId,
        email: "athlete@test.local",
        first_name: "Test",
        last_name: "Buyer",
        date_of_birth: "1990-01-15",
        gender: "male",
        deleted_at: null,
        status: "active",
      },
      {
        id: 1002,
        email: "family@test.local",
        first_name: "Family",
        last_name: "Member",
        date_of_birth: "1992-06-01",
        gender: "female",
        deleted_at: null,
        status: "active",
      },
    ];
    for (const a of defaults) {
      this.athletes.set(a.id, { ...a });
    }
    this.registrations = [...(seed.registrations ?? [])];
  }

  asPool(): Pool {
    const runQuery = this.runQuery.bind(this);
    const connection = {
      query: runQuery,
      release: () => undefined,
      beginTransaction: async () => undefined,
      commit: async () => undefined,
      rollback: async () => undefined,
    } as unknown as PoolConnection;

    return {
      query: runQuery,
      getConnection: async () => connection,
    } as unknown as Pool;
  }

  private athleteByEmail(email: string): MemoryAthlete | undefined {
    const key = email.trim().toLowerCase();
    return [...this.athletes.values()].find(
      (a) => a.email.toLowerCase() === key && !a.deleted_at && a.status === "active",
    );
  }

  private soldCount(): number {
    return this.registrations.filter(
      (r) =>
        r.event_category_id === this.categoryId &&
        r.status === "confirmed" &&
        !r.deleted_at,
    ).length;
  }

  private async runQuery(
    sql: string,
    params: unknown[] = [],
  ): Promise<[unknown, unknown]> {
    const q = normalizeSql(sql);

    if (q.includes("from event_categories") && q.includes("is_active = 1")) {
      return [
        [
          {
            ...this.category,
            sold_count: this.soldCount(),
          },
        ],
        [],
      ];
    }

    if (q.includes("from athletes where email = ?")) {
      const hit = this.athleteByEmail(String(params[0] ?? ""));
      return [hit ? [{ ...hit }] : [], []];
    }

    if (
      q.includes("select preferred_language from athletes") &&
      q.includes("where id = ?")
    ) {
      const hit = this.athletes.get(Number(params[0]));
      return [
        hit && !hit.deleted_at
          ? [{ preferred_language: (hit as MemoryAthlete & { preferred_language?: string }).preferred_language ?? "es" }]
          : [],
        [],
      ];
    }

    if (
      q.includes("from athletes where id = ?") &&
      q.includes("first_name") &&
      q.includes("deleted_at is null")
    ) {
      const hit = this.athletes.get(Number(params[0]));
      return [hit && !hit.deleted_at ? [{ ...hit }] : [], []];
    }

    if (q.includes("insert into athletes")) {
      const id = this.nextAthleteId++;
      const athlete: MemoryAthlete = {
        id,
        email: String(params[1]).toLowerCase(),
        first_name: String(params[2]),
        last_name: String(params[3]),
        date_of_birth: String(params[4]),
        gender: String(params[5]),
        preferred_language: params[6] != null ? String(params[6]) : "es",
        deleted_at: null,
        status: "active",
      };
      this.athletes.set(id, athlete);
      return [header(id, 1), []];
    }

    if (
      q.includes("select id from registrations") &&
      q.includes("status = 'confirmed'") &&
      q.includes("deleted_at is null")
    ) {
      const eventId = Number(params[0]);
      const athleteId = Number(params[1]);
      const excludeId = params[2] != null ? Number(params[2]) : null;
      const hit = this.registrations.find(
        (r) =>
          r.event_id === eventId &&
          r.athlete_id === athleteId &&
          r.status === "confirmed" &&
          !r.deleted_at &&
          (excludeId == null || r.id !== excludeId),
      );
      return [hit ? [{ id: hit.id }] : [], []];
    }

    if (q.includes("where r.guest_claim_token = ?")) {
      const token = String(params[0] ?? "");
      const hit = this.registrations.find(
        (r) => r.guest_claim_token === token && r.status === "confirmed" && !r.deleted_at,
      );
      if (!hit) return [[], []];
      const athlete = this.athletes.get(hit.athlete_id);
      return [
        [
          {
            ...hit,
            guest_email: athlete?.email ?? "",
            event_slug: SCENARIO.slug,
            event_title: SCENARIO.eventTitle,
            category_name: this.category.name,
          },
        ],
        [],
      ];
    }

    if (q.startsWith("update registrations set athlete_id")) {
      const athleteId = Number(params[0]);
      const regId = Number(params[1]);
      const reg = this.registrations.find((r) => r.id === regId);
      if (reg) {
        reg.athlete_id = athleteId;
        reg.guest_claim_token = null;
      }
      return [header(0, reg ? 1 : 0), []];
    }

    if (q.startsWith("update registrations set guest_claim_token = null")) {
      const regId = Number(params[0]);
      const reg = this.registrations.find((r) => r.id === regId);
      if (reg) reg.guest_claim_token = null;
      return [header(0, reg ? 1 : 0), []];
    }

    if (q.includes("from athletes where id = ?") && q.includes("status = 'active'")) {
      const hit = this.athletes.get(Number(params[0]));
      return [hit && !hit.deleted_at ? [{ id: hit.id, email: hit.email }] : [], []];
    }

    if (q.includes("from events where id = ?")) {
      return [[{ slug: SCENARIO.slug, start_date: this.eventStartDate }], []];
    }

    if (q.includes("from event_waivers") && q.includes("is_active = 1")) {
      return [
        this.waivers.map((w) => ({
          id: w.id,
          title: w.title,
          content_html: "<p>waiver</p>",
          pdf_url: null,
          content_type: "html",
          audience: "all",
          category_ids: null,
          version: w.version,
          sort_order: 0,
        })),
        [],
      ];
    }

    if (q.includes("select version from event_waivers where id")) {
      const waiverId = Number(params[0]);
      const w = this.waivers.find((x) => x.id === waiverId);
      return [w ? [{ version: w.version }] : [], []];
    }

    if (q.includes("insert into registration_waiver_signatures")) {
      const registrationId = Number(params[0]);
      const waiverId = Number(params[1]);
      const existing = this.waiverSignatures.find(
        (s) => s.registration_id === registrationId && s.waiver_id === waiverId,
      );
      const row = {
        registration_id: registrationId,
        waiver_id: waiverId,
        waiver_version_at_sign: Number(params[2] ?? 1),
        ip_address: params[3] != null ? String(params[3]) : null,
        signature_data: params[6] != null ? String(params[6]) : null,
        signed_at: new Date().toISOString(),
        acceptance_pdf_url: null as string | null,
      };
      if (existing) Object.assign(existing, row);
      else this.waiverSignatures.push(row);
      return [header(1, 1), []];
    }

    if (
      q.includes("from registration_waiver_signatures rws") &&
      q.includes("join event_waivers ew")
    ) {
      const registrationId = Number(params[0]);
      const rows = this.waiverSignatures
        .filter((s) => s.registration_id === registrationId)
        .filter(
          (s) =>
            s.signature_data == null ||
            !String(s.signature_data).startsWith("WAIVED_BY_STAFF"),
        )
        .map((s) => {
          const ew = this.waivers.find((w) => w.id === s.waiver_id);
          return {
            id: s.waiver_id,
            waiver_id: s.waiver_id,
            title: ew?.title ?? "Waiver",
            waiver_title: ew?.title ?? "Waiver",
            acceptance_pdf_url: s.acceptance_pdf_url,
            waiver_version_at_sign: s.waiver_version_at_sign,
            signed_at: s.signed_at,
            ip_address: s.ip_address,
            pdf_url: ew && "pdf_url" in ew ? ((ew as { pdf_url?: string | null }).pdf_url ?? null) : null,
            version: ew?.version ?? s.waiver_version_at_sign,
          };
        });
      return [rows, []];
    }

    if (
      q.includes("update registration_waiver_signatures") &&
      q.includes("acceptance_pdf_url")
    ) {
      const url = params[0] != null ? String(params[0]) : null;
      const registrationId = Number(params[1]);
      const waiverId = Number(params[2]);
      const row = this.waiverSignatures.find(
        (s) => s.registration_id === registrationId && s.waiver_id === waiverId,
      );
      if (row) row.acceptance_pdf_url = url;
      return [header(0, row ? 1 : 0), []];
    }

    if (q.includes("update registrations set waiver_signed_at")) {
      return [header(0, 1), []];
    }

    if (q.includes("from event_extras") || q.includes("event_extras")) {
      return [[], []];
    }

    if (q.includes("from event_registration_fields")) {
      return [[], []];
    }

    if (q.includes("from event_registration_field_categories")) {
      return [[], []];
    }

    throw new Error(`GroupRegistrationMemoryPool: unhandled SQL: ${sql}`);
  }

  addConfirmedRegistration(
    athleteId: number,
    overrides?: Partial<MemoryRegistration>,
  ): MemoryRegistration {
    const reg = {
      id: this.nextRegistrationId++,
      public_uuid: `reg-${this.nextRegistrationId}`,
      event_id: this.eventId,
      event_category_id: this.categoryId,
      athlete_id: athleteId,
      status: "confirmed",
      deleted_at: null,
      guest_claim_token: null,
      registration_number: `REG-${this.nextRegistrationId}`,
      ...overrides,
    } as MemoryRegistration;
    this.registrations.push(reg);
    return reg;
  }
}
