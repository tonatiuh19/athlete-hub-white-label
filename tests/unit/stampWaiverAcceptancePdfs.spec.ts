/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { stampRegistrationWaiverAcceptancePdfs } from "../../server/stampWaiverAcceptancePdfs";
import { createMockPool } from "../helpers/mockDb";

describe("stampRegistrationWaiverAcceptancePdfs", () => {
  const prevVitest = process.env.VITEST;
  const prevTestMode = process.env.ATLEITA_TEST_MODE;

  beforeEach(() => {
    process.env.VITEST = "true";
    process.env.ATLEITA_TEST_MODE = "1";
  });

  afterEach(() => {
    process.env.VITEST = prevVitest;
    process.env.ATLEITA_TEST_MODE = prevTestMode;
  });

  it("returns stamped PDF bytes, test:// URLs, and persists acceptance_pdf_url", async () => {
    const acceptanceByWaiver = new Map<number, string | null>();
    const sigRows: RowDataPacket[] = [
      {
        waiver_id: 11,
        waiver_version_at_sign: 3,
        signed_at: "2026-09-28T12:00:00.000Z",
        ip_address: "10.0.0.1",
        waiver_title: "Carta Adultos",
        pdf_url: "https://cdn.example/carta.pdf",
        version: 3,
      } as RowDataPacket,
      {
        waiver_id: 12,
        waiver_version_at_sign: 1,
        signed_at: "2026-09-28T12:00:00.000Z",
        ip_address: null,
        waiver_title: "Medical",
        pdf_url: null,
        version: 1,
      } as RowDataPacket,
    ];

    const pool = createMockPool((sql, params) => {
      const q = sql.toLowerCase();
      if (q.includes("from registration_waiver_signatures rws")) {
        return [sigRows, []];
      }
      if (q.includes("update registration_waiver_signatures") && q.includes("acceptance_pdf_url")) {
        acceptanceByWaiver.set(Number(params?.[2]), String(params?.[0]));
        return [[{} as RowDataPacket], []];
      }
      throw new Error(`Unmocked SQL: ${sql.slice(0, 120)}`);
    });

    const stamped = await stampRegistrationWaiverAcceptancePdfs(pool, 42, {
      locale: "es",
      athleteFullName: "Ana Gómez",
      eventTitle: "San Ramón",
      categoryName: "5K",
      registrationNumber: "REG-SR-1",
      organizerName: "Comité",
    });

    expect(stamped).toHaveLength(2);
    expect(stamped[0].url).toBe("test://waiver-acceptance/42/11.pdf");
    expect(stamped[1].url).toBe("test://waiver-acceptance/42/12.pdf");
    expect(Buffer.from(stamped[0].bytes).subarray(0, 4).toString()).toBe("%PDF");
    expect(stamped[0].filename).toContain("REG-SR-1");
    expect(acceptanceByWaiver.get(11)).toBe(stamped[0].url);
    expect(acceptanceByWaiver.get(12)).toBe(stamped[1].url);
  });

  it("continues when one waiver stamp fails", async () => {
    let updates = 0;
    const pool = createMockPool((sql) => {
      const q = sql.toLowerCase();
      if (q.includes("from registration_waiver_signatures rws")) {
        return [
          [
            {
              waiver_id: 1,
              waiver_version_at_sign: 1,
              signed_at: null,
              ip_address: null,
              waiver_title: "Ok",
              pdf_url: null,
              version: 1,
            },
            {
              waiver_id: 2,
              waiver_version_at_sign: 1,
              signed_at: null,
              ip_address: null,
              waiver_title: "Fail",
              pdf_url: null,
              version: 1,
            },
          ] as RowDataPacket[],
          [],
        ];
      }
      if (q.includes("update registration_waiver_signatures")) {
        updates += 1;
        if (updates === 2) throw new Error("cdn down");
        return [[{} as RowDataPacket], []];
      }
      throw new Error(`Unmocked SQL: ${sql.slice(0, 120)}`);
    });

    const stamped = await stampRegistrationWaiverAcceptancePdfs(pool, 7, {
      locale: "en",
      athleteFullName: "A",
      eventTitle: "E",
      categoryName: "C",
      registrationNumber: "R",
    });

    expect(stamped).toHaveLength(1);
    expect(stamped[0].waiverId).toBe(1);
  });
});
