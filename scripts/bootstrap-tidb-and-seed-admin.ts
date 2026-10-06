import "dotenv/config";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

function dbConfig(database?: string) {
  return {
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 4000),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" as const },
    multipleStatements: true,
    connectTimeout: 30_000,
  };
}

async function ensureDatabase(dbName: string) {
  const conn = await mysql.createConnection(dbConfig(undefined));
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`OK database ready: ${dbName}`);
  } finally {
    await conn.end();
  }
}

async function applySchema(dbName: string) {
  const conn = await mysql.createConnection(dbConfig(dbName));
  try {
    const [tables] = await conn.query<RowDataPacket[]>("SHOW TABLES LIKE 'admins'");
    if (tables.length) {
      console.log("OK schema already present (admins exists) — skipping full schema apply");
      return;
    }

    const schemaPath = path.resolve("database/schema.sql");
    let sql = readFileSync(schemaPath, "utf8");
    // Drop MySQL dump session noise that can confuse TiDB Serverless batch apply.
    sql = sql
      .replace(/\/\*![0-9]+.*?\*\//gs, "")
      .replace(/^SET .*?;$/gm, "")
      .replace(/^LOCK TABLES[\s\S]*?UNLOCK TABLES;$/gm, "");

    console.log("Applying database/schema.sql (this may take a minute)...");
    await conn.query(sql);
    console.log("OK schema applied");
  } finally {
    await conn.end();
  }
}

async function seedAdmin(dbName: string) {
  const email = "alex@disruptinglabs.com";
  const firstName = "Alex";
  const lastName = "Gomez";
  const conn = await mysql.createConnection(dbConfig(dbName));
  try {
    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM admins WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [email],
    );

    if (existing.length) {
      await conn.query(
        `UPDATE admins
         SET first_name = ?, last_name = ?, role = 'super_admin', status = 'active',
             deleted_at = NULL, preferred_language = 'es'
         WHERE id = ?`,
        [firstName, lastName, existing[0].id],
      );
      console.log(JSON.stringify({ action: "updated", id: existing[0].id, email }));
    } else {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO admins
          (public_uuid, email, first_name, last_name, role, status, preferred_language, preferred_theme)
         VALUES (?, ?, ?, ?, 'super_admin', 'active', 'es', 'system')`,
        [randomUUID(), email, firstName, lastName],
      );
      console.log(JSON.stringify({ action: "inserted", id: result.insertId, email }));
    }

    const [verify] = await conn.query<RowDataPacket[]>(
      `SELECT id, email, first_name, last_name, role, status
       FROM admins WHERE LOWER(TRIM(email)) = ?`,
      [email],
    );
    console.log("VERIFY", JSON.stringify(verify[0]));
  } finally {
    await conn.end();
  }
}

async function main() {
  const dbName = requireEnv("DB_NAME");
  await ensureDatabase(dbName);
  await applySchema(dbName);
  await seedAdmin(dbName);
  console.log("\nStaff admin ready. Login: /admin/login with", "alex@disruptinglabs.com");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
