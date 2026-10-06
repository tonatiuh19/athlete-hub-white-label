import "dotenv/config";
import { randomUUID } from "crypto";
import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

async function main() {
  const email = "alex@disruptinglabs.com";
  const firstName = "Alex";
  const lastName = "Gomez";

  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
  for (const key of required) {
    if (!process.env[key]?.trim()) {
      throw new Error(`Missing ${key} in .env`);
    }
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
    connectTimeout: 20_000,
  });

  try {
    const [tables] = await conn.query<RowDataPacket[]>("SHOW TABLES LIKE 'admins'");
    if (!tables.length) {
      throw new Error(
        "Table `admins` does not exist. Apply base schema / migrations before seeding admin.",
      );
    }

    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT id, email, first_name, last_name, role, status, deleted_at
       FROM admins WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [email],
    );

    if (existing.length) {
      await conn.query<ResultSetHeader>(
        `UPDATE admins
         SET first_name = ?, last_name = ?, role = 'super_admin', status = 'active',
             deleted_at = NULL, preferred_language = 'es'
         WHERE id = ?`,
        [firstName, lastName, existing[0].id],
      );
      console.log(
        JSON.stringify({
          action: "updated",
          id: existing[0].id,
          email,
          role: "super_admin",
          status: "active",
        }),
      );
    } else {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO admins
          (public_uuid, email, first_name, last_name, role, status, preferred_language, preferred_theme)
         VALUES (?, ?, ?, ?, 'super_admin', 'active', 'es', 'system')`,
        [randomUUID(), email, firstName, lastName],
      );
      console.log(
        JSON.stringify({
          action: "inserted",
          id: result.insertId,
          email,
          role: "super_admin",
          status: "active",
        }),
      );
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

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
