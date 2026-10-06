import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import mysql, { type RowDataPacket } from "mysql2/promise";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const conn = await mysql.createConnection({
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 4000),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
    multipleStatements: true,
    connectTimeout: 60_000,
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_schema_migrations_filename (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await conn.query<RowDataPacket[]>(
      "SELECT filename FROM schema_migrations",
    );
    const applied = new Set(appliedRows.map((r) => String(r.filename)));

    // Mark initial schema as applied if admins exists but not recorded
    if (!applied.has("20260530_000000_initial_schema.sql")) {
      const [t] = await conn.query<RowDataPacket[]>("SHOW TABLES LIKE 'admins'");
      if (t.length) {
        await conn.query(
          "INSERT IGNORE INTO schema_migrations (filename) VALUES (?)",
          ["20260530_000000_initial_schema.sql"],
        );
        applied.add("20260530_000000_initial_schema.sql");
      }
    }

    const dir = path.resolve("database/migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ok = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      if (applied.has(file)) {
        skipped += 1;
        continue;
      }
      const sql = readFileSync(path.join(dir, file), "utf8");
      try {
        await conn.query(sql);
        await conn.query(
          "INSERT INTO schema_migrations (filename) VALUES (?)",
          [file],
        );
        ok += 1;
        console.log("OK", file);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Idempotent-ish: duplicate column/key/table → record and continue
        if (
          /Duplicate column|Duplicate key name|already exists|Duplicate entry/i.test(
            msg,
          )
        ) {
          await conn.query(
            "INSERT IGNORE INTO schema_migrations (filename) VALUES (?)",
            [file],
          );
          ok += 1;
          console.log("OK(idempotent)", file, "—", msg.slice(0, 100));
          continue;
        }
        failed += 1;
        console.error("FAIL", file, "—", msg.slice(0, 220));
      }
    }

    const [tables] = await conn.query<RowDataPacket[]>("SHOW TABLES");
    console.log(
      JSON.stringify({
        applied: ok,
        skipped,
        failed,
        tableCount: tables.length,
      }),
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
