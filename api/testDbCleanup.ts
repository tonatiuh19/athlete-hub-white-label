/**
 * Shared cleanup for API integration tests that seed rows into shared TiDB.
 *
 *   afterAll(async () => {
 *     await cleanupIntegrationTestFixtures(pool, { runId: RUN_ID, athleteIds, eventIds });
 *     await pool?.end();
 *   });
 *
 * Ops purge: npm run test:cleanup-fixtures
 */
import mysql, { type Pool, type ResultSetHeader } from "mysql2/promise";
import crypto from "crypto";

export function uniqueTestEmail(prefix: string, runId: string): string {
  return `${prefix}-${runId}@test.local`;
}

/** TiDB-safe pool for integration tests (keepAlive + connect timeout). */
export function createIntegrationTestPool(): Pool {
  const host = process.env.DB_HOST?.trim();
  if (!host || host === "test-local") {
    throw new Error(
      "Integration tests require real DB_* env (.env). Mock suites use setTestPool() instead.",
    );
  }
  return mysql.createPool({
    host,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
    timezone: "+00:00",
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 60_000,
  });
}

function isRetriableDbError(err: unknown): boolean {
  const code = String((err as NodeJS.ErrnoException)?.code || "");
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "ECONNREFUSED"
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 1500;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetriableDbError(err) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw lastErr;
}

export function resolveCleanupRunId(
  opts: { runId?: string } | string | undefined,
): string {
  if (typeof opts === "string") return opts;
  const runId = opts?.runId?.trim();
  if (!runId) {
    throw new Error("cleanupIntegrationTestFixtures requires { runId }");
  }
  return runId;
}

export type IntegrationCleanupOpts = {
  runId: string;
  athleteIds?: number[];
  organizerIds?: number[];
  eventIds?: number[];
  adminIds?: number[];
};

/** Remove vitest fixtures — only @test.local / run-id tagged rows. */
export async function cleanupIntegrationTestFixtures(
  pool: Pool,
  opts: IntegrationCleanupOpts,
): Promise<void> {
  const runId = resolveCleanupRunId(opts);
  const likeRun = `%${runId}%@test.local`;

  const eventIds = opts.eventIds ?? [];
  const athleteIds = opts.athleteIds ?? [];
  const organizerIds = opts.organizerIds ?? [];
  const adminIds = opts.adminIds ?? [];

  await withDbRetry(async () => {
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(",");
      await pool.query(
        `DELETE FROM event_registrations WHERE event_id IN (${placeholders})`,
        eventIds,
      );
      await pool.query(`DELETE FROM events WHERE id IN (${placeholders})`, eventIds);
    }

    if (athleteIds.length > 0) {
      const placeholders = athleteIds.map(() => "?").join(",");
      await pool
        .query(`DELETE FROM athlete_sessions WHERE athlete_id IN (${placeholders})`, athleteIds)
        .catch(() => undefined);
      await pool.query(`DELETE FROM athletes WHERE id IN (${placeholders})`, athleteIds);
    }

    if (organizerIds.length > 0) {
      const placeholders = organizerIds.map(() => "?").join(",");
      await pool
        .query(
          `DELETE FROM organizer_members WHERE organizer_id IN (${placeholders})`,
          organizerIds,
        )
        .catch(() => undefined);
      await pool.query(`DELETE FROM organizers WHERE id IN (${placeholders})`, organizerIds);
    }

    for (const adminId of adminIds) {
      await pool
        .query(`DELETE FROM admin_sessions WHERE admin_id = ?`, [adminId])
        .catch(() => undefined);
      await pool.query(`DELETE FROM admins WHERE id = ?`, [adminId]).catch(() => undefined);
    }

    await pool.query<ResultSetHeader>(
      `DELETE FROM athletes WHERE email LIKE ? OR email LIKE '%@test.local'`,
      [likeRun],
    );
    await pool.query<ResultSetHeader>(
      `DELETE FROM organizer_members WHERE email LIKE ? OR email LIKE '%@test.local'`,
      [likeRun],
    );
    await pool.query<ResultSetHeader>(
      `DELETE FROM admins WHERE email LIKE ? OR email LIKE '%@test.local'`,
      [likeRun],
    );
  });
}

export function integrationRunId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}
