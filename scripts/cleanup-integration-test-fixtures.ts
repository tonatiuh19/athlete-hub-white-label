/**
 * Purge leftover integration-test fixtures from TiDB (@test.local emails).
 *
 *   npm run test:cleanup-fixtures
 *   npm run test:cleanup-fixtures -- --dry-run
 */
import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  if (!process.env.DB_HOST) {
    console.error("DB_HOST required (.env)");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true },
    connectionLimit: 2,
  });

  try {
    const checks: Array<[string, string]> = [
      [
        "athletes @test.local",
        `SELECT id, email FROM athletes WHERE email LIKE '%@test.local' ORDER BY id DESC LIMIT 50`,
      ],
      [
        "organizer_members @test.local",
        `SELECT id, email FROM organizer_members WHERE email LIKE '%@test.local' ORDER BY id DESC LIMIT 50`,
      ],
      [
        "admins @test.local",
        `SELECT id, email FROM admins WHERE email LIKE '%@test.local' ORDER BY id DESC LIMIT 50`,
      ],
    ];

    for (const [label, sql] of checks) {
      const [rows] = await pool.query(sql);
      const count = (rows as unknown[]).length;
      console.log(`${label}: ${count} row(s)`);
      if (count > 0) console.table(rows);
    }

    if (dryRun) {
      console.log("\nDry run — no deletes.");
      return;
    }

    const [athletes] = await pool.query<mysql.ResultSetHeader>(
      `DELETE FROM athletes WHERE email LIKE '%@test.local'`,
    );
    const [members] = await pool.query<mysql.ResultSetHeader>(
      `DELETE FROM organizer_members WHERE email LIKE '%@test.local'`,
    );
    const [admins] = await pool.query<mysql.ResultSetHeader>(
      `DELETE FROM admins WHERE email LIKE '%@test.local'`,
    );

    console.log(
      `\nDeleted athletes=${athletes.affectedRows} members=${members.affectedRows} admins=${admins.affectedRows}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
