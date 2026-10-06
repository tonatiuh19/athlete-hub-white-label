/**
 * Real-DB integration: admin session create → /auth/admin/me → admin_sessions row.
 * Requires .env DB_* (skipped when only mock test env is available).
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { createServer, createSession } from "./index.js";
import { setTestPool, resetTestEnvironment } from "./testHooks.js";
import { createIntegrationTestPool } from "./testDbCleanup.js";

const hasRealDb =
  Boolean(process.env.DB_HOST?.trim()) &&
  process.env.DB_HOST !== "test-local" &&
  Boolean(process.env.DB_USER) &&
  Boolean(process.env.DB_PASSWORD) &&
  Boolean(process.env.DB_NAME);

describe.skipIf(!hasRealDb)("staff auth sessions (integration)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let adminId = 0;
  let adminEmail = "";
  let token = "";
  let sessionId = 0;

  beforeAll(async () => {
    process.env.VITEST = "true";
    process.env.ATLEITA_TEST_MODE = "1";
    pool = createIntegrationTestPool();
    setTestPool(pool);
    app = createServer();

    const [admins] = await pool.query<RowDataPacket[]>(
      `SELECT id, email FROM admins
       WHERE status = 'active' AND deleted_at IS NULL
       ORDER BY id ASC LIMIT 1`,
    );
    if (!admins[0]) {
      throw new Error("No active admin in DB for staff auth session integration test");
    }
    adminId = Number(admins[0].id);
    adminEmail = String(admins[0].email);
    token = await createSession(
      "admin",
      adminId,
      adminEmail,
      "127.0.0.1",
      `vitest-staff-auth-${Date.now()}`,
    );
    const [sessions] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM admin_sessions WHERE admin_id = ? ORDER BY id DESC LIMIT 1`,
      [adminId],
    );
    sessionId = Number(sessions[0]?.id ?? 0);
  }, 60_000);

  afterAll(async () => {
    if (sessionId) {
      await pool
        .query(`DELETE FROM admin_sessions WHERE id = ?`, [sessionId])
        .catch(() => undefined);
    }
    resetTestEnvironment();
    await pool?.end();
  }, 90_000);

  it("GET /api/auth/admin/me returns profile for active session", async () => {
    const res = await request(app)
      .get("/api/auth/admin/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin?.email).toBe(adminEmail);
  });

  it("admin_sessions row is active with future expiry", async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, is_active, expires_at
         FROM admin_sessions
        WHERE admin_id = ? AND is_active = 1 AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1`,
      [adminId],
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].is_active).toBe(1);
  });

  it("revoked session returns 401 Session expired on /me", async () => {
    await pool.query(`UPDATE admin_sessions SET is_active = 0 WHERE id = ?`, [sessionId]);
    const res = await request(app)
      .get("/api/auth/admin/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("session_expired");
    expect(res.body.error).toMatch(/session expired|sesión expirada/i);
  });
});
