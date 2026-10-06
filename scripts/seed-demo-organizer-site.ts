import "dotenv/config";
import { randomUUID } from "crypto";
import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { ensureOrganizerSite, patchOrganizerSite } from "../server/organizerSites.js";

/**
 * Seeds a demo organizer + published microsite for local vanity-host testing.
 * Usage: npx tsx scripts/seed-demo-organizer-site.ts
 */
async function main() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
  for (const key of required) {
    if (!process.env[key]?.trim()) {
      throw new Error(`Missing ${key} in .env`);
    }
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
    connectionLimit: 2,
  });

  const orgEmail = "demo-org@atleita.local";
  const memberEmail = "demo-organizer@atleita.local";
  const subdomain = "demo";

  try {
    let organizerId: number;
    const [existingOrg] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM organizers WHERE slug = 'demo-atleita' LIMIT 1`,
    );
    if (existingOrg.length) {
      organizerId = Number(existingOrg[0].id);
      console.log(`Organizer exists id=${organizerId}`);
    } else {
      // Detect optional public_uuid column (some TiDB dumps omit it until patched).
      const [cols] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM organizers LIKE 'public_uuid'`,
      );
      if (cols.length) {
        const [ins] = await pool.query<ResultSetHeader>(
          `INSERT INTO organizers
            (public_uuid, slug, name, email, status, country)
           VALUES (?, 'demo-atleita', 'Demo Atleita Org', ?, 'active', 'MX')`,
          [randomUUID(), orgEmail],
        );
        organizerId = Number(ins.insertId);
      } else {
        const [ins] = await pool.query<ResultSetHeader>(
          `INSERT INTO organizers
            (slug, name, email, status, country)
           VALUES ('demo-atleita', 'Demo Atleita Org', ?, 'active', 'MX')`,
          [orgEmail],
        );
        organizerId = Number(ins.insertId);
      }
      console.log(`Created organizer id=${organizerId}`);
    }

    const [memberCols] = await pool.query<RowDataPacket[]>(
      `SHOW COLUMNS FROM organizer_members LIKE 'public_uuid'`,
    );
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM organizer_members WHERE email = ? LIMIT 1`,
      [memberEmail],
    );
    if (!members.length) {
      if (memberCols.length) {
        await pool.query(
          `INSERT INTO organizer_members
            (public_uuid, organizer_id, email, first_name, last_name, role, status, preferred_language)
           VALUES (?, ?, ?, 'Demo', 'Organizer', 'owner', 'active', 'es')`,
          [randomUUID(), organizerId, memberEmail],
        );
      } else {
        await pool.query(
          `INSERT INTO organizer_members
            (organizer_id, email, first_name, last_name, role, status, preferred_language)
           VALUES (?, ?, 'Demo', 'Organizer', 'owner', 'active', 'es')`,
          [organizerId, memberEmail],
        );
      }
      console.log(`Created organizer member ${memberEmail}`);
    } else {
      console.log(`Organizer member exists ${memberEmail}`);
    }

    const siteId = await ensureOrganizerSite(pool, organizerId, {
      subdomainHint: subdomain,
      organizerName: "Demo Atleita Org",
    });
    await patchOrganizerSite(pool, siteId, {
      subdomain,
      status: "published",
      localeDefault: "es",
      theme: {
        tagline: "Inscripciones white-label de demostración",
        primaryColor: "#214B3A",
        accentColor: "#D7ED70",
        secondaryColor: "#18231F",
        backgroundColor: "#F7F9F6",
        textColor: "#18231F",
      },
      legal: [
        {
          documentKey: "terms",
          locale: "es",
          title: "Términos",
          bodyHtml: "<p>Términos de demostración.</p>",
        },
        {
          documentKey: "privacy",
          locale: "es",
          title: "Privacidad",
          bodyHtml: "<p>Aviso de privacidad de demostración.</p>",
        },
        {
          documentKey: "refund",
          locale: "es",
          title: "Reembolsos",
          bodyHtml: "<p>Política de reembolsos de demostración.</p>",
        },
      ],
    });

    // Seed OTP template definition (platform-owned)
    await pool.query(
      `INSERT INTO email_template_definitions
        (template_key, audience, editable_by_organizer, supports_event_override, required_tokens_json)
       VALUES ('otp_login', 'athlete', 0, 0, CAST('["code","firstName"]' AS JSON))
       ON DUPLICATE KEY UPDATE editable_by_organizer = 0`,
    );

    const apex = (process.env.PUBLIC_APP_URL || "http://localhost:8080").replace(
      /\/$/,
      "",
    );
    let preview = `${apex.replace("://", "://demo.")}`;
    try {
      const u = new URL(apex);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        preview = `${u.protocol}//demo.localhost${u.port ? `:${u.port}` : ""}`;
      } else {
        preview = `${u.protocol}//demo.${u.hostname.replace(/^www\./, "")}${u.port ? `:${u.port}` : ""}`;
      }
    } catch {
      /* keep fallback */
    }

    console.log("Demo microsite published.");
    console.log(`  organizer_id=${organizerId} site_id=${siteId}`);
    console.log(`  member login OTP: ${memberEmail}`);
    console.log(`  vanity URL: ${preview}/`);
    console.log(`  athlete login: ${preview}/login`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
