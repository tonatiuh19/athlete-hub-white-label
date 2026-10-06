import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { Express, Request, Response } from "express";
import { normalizeCdnUploadUrl } from "./cdnUpload.js";
import {
  normalizeEventSubdomain,
  validateEventSubdomainFormat,
} from "../shared/eventSubdomain.js";

export type OrganizerSiteTheme = {
  logoUrl: string | null;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonRadiusPx: number;
  tagline: string | null;
};

export type OrganizerSiteSection = {
  sectionKey: string;
  enabled: boolean;
  sortOrder: number;
  contentJson: Record<string, unknown>;
};

export type OrganizerSiteLegalDoc = {
  documentKey: string;
  locale: string;
  title: string;
  bodyHtml: string;
};

/** Compact event card for microsite upcoming_events (editor + public). */
export type OrganizerMicrositeEvent = {
  id: number;
  slug: string;
  subdomain: string | null;
  title: string;
  status: string;
  startDate: string;
  locationCity: string | null;
  sportName: string | null;
  heroImageUrl: string | null;
};

export type OrganizerSitePayload = {
  id: number;
  organizerId: number;
  organizerName: string;
  organizerSlug: string;
  subdomain: string;
  status: string;
  templateKey: string;
  localeDefault: string;
  theme: OrganizerSiteTheme;
  sections: OrganizerSiteSection[];
  legal: OrganizerSiteLegalDoc[];
  events: OrganizerMicrositeEvent[];
};

export function isRichHtmlEmpty(html: string | null | undefined): boolean {
  const t = String(html ?? "").trim();
  return (
    !t ||
    t === "<p></p>" ||
    t === "<p><br></p>" ||
    t === "<p><br/></p>"
  );
}

export const ORGANIZER_SITE_LEGAL_KEYS = ["terms", "privacy", "refund"] as const;
export type OrganizerSiteLegalKey = (typeof ORGANIZER_SITE_LEGAL_KEYS)[number];

/**
 * Editor preview includes draft + pending_approval so organizers can see layout.
 * Public vanity host only returns published + public events (never drafts).
 */
export function micrositeEventsStatusClause(includeUnpublished: boolean): string {
  if (includeUnpublished) {
    return `e.status IN ('draft', 'pending_approval', 'published')`;
  }
  return `e.status = 'published' AND e.visibility = 'public'`;
}

export async function listOrganizerMicrositeEvents(
  pool: Pool,
  organizerId: number,
  opts?: { includeUnpublished?: boolean; limit?: number },
): Promise<OrganizerMicrositeEvent[]> {
  const includeUnpublished = opts?.includeUnpublished === true;
  const limit = Math.min(24, Math.max(1, Number(opts?.limit) || 12));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id, e.slug, e.subdomain, e.title, e.status, e.start_date,
            e.location_city, e.hero_image_url, st.name AS sport_name
     FROM events e
     JOIN sport_types st ON st.id = e.sport_type_id
     WHERE e.organizer_id = ?
       AND e.deleted_at IS NULL
       AND COALESCE(e.is_simulation, 0) = 0
       AND ${micrositeEventsStatusClause(includeUnpublished)}
     ORDER BY e.start_date ASC, e.id DESC
     LIMIT ?`,
    [organizerId, limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    subdomain: row.subdomain != null ? String(row.subdomain) : null,
    title: String(row.title),
    status: String(row.status),
    startDate: String(row.start_date),
    locationCity: row.location_city != null ? String(row.location_city) : null,
    sportName: row.sport_name != null ? String(row.sport_name) : null,
    heroImageUrl: row.hero_image_url
      ? normalizeCdnUploadUrl(String(row.hero_image_url))
      : null,
  }));
}

/**
 * ES terms + privacy + refund must be non-empty HTML before an event can be
 * submitted/approved. Does not create a site — missing site ⇒ all keys missing.
 */
export async function getOrganizerSiteLegalStatus(
  pool: Pool,
  organizerId: number,
  locale: "es" | "en" = "es",
): Promise<{
  ready: boolean;
  missing: OrganizerSiteLegalKey[];
}> {
  const [sites] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM organizer_sites
     WHERE organizer_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [organizerId],
  );
  if (!sites.length) {
    return { ready: false, missing: [...ORGANIZER_SITE_LEGAL_KEYS] };
  }

  const siteId = Number(sites[0].id);
  const [docs] = await pool.query<RowDataPacket[]>(
    `SELECT document_key, body_html
     FROM organizer_site_legal_documents
     WHERE organizer_site_id = ? AND locale = ?`,
    [siteId, locale],
  );

  const byKey = new Map<string, string>();
  for (const doc of docs) {
    byKey.set(String(doc.document_key), String(doc.body_html ?? ""));
  }

  const missing = ORGANIZER_SITE_LEGAL_KEYS.filter((key) =>
    isRichHtmlEmpty(byKey.get(key)),
  );
  return { ready: missing.length === 0, missing };
}

export async function validateOrganizerSiteLegalReady(
  pool: Pool,
  organizerId: number,
  locale: "es" | "en" = "es",
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: string;
      code: "site_legal_incomplete";
      missing: OrganizerSiteLegalKey[];
    }
> {
  const status = await getOrganizerSiteLegalStatus(pool, organizerId, locale);
  if (status.ready) return { ok: true };
  return {
    ok: false,
    code: "site_legal_incomplete",
    missing: status.missing,
    error:
      "Complete organizer legal documents (terms, privacy, and refunds) in Site Legal before publishing events",
  };
}

const DEFAULT_THEME: OrganizerSiteTheme = {
  logoUrl: null,
  faviconUrl: null,
  heroImageUrl: null,
  primaryColor: "#214B3A",
  secondaryColor: "#18231F",
  accentColor: "#D7ED70",
  backgroundColor: "#F7F9F6",
  textColor: "#18231F",
  fontFamily: "Archivo, system-ui, sans-serif",
  buttonRadiusPx: 10,
  tagline: null,
};

const DEFAULT_SECTIONS: Array<{
  sectionKey: string;
  enabled: boolean;
  sortOrder: number;
  contentJson: Record<string, unknown>;
}> = [
  { sectionKey: "hero", enabled: true, sortOrder: 0, contentJson: {} },
  { sectionKey: "about", enabled: true, sortOrder: 1, contentJson: {} },
  { sectionKey: "upcoming_events", enabled: true, sortOrder: 2, contentJson: {} },
  { sectionKey: "sponsors", enabled: false, sortOrder: 3, contentJson: {} },
  { sectionKey: "faq", enabled: false, sortOrder: 4, contentJson: {} },
  { sectionKey: "footer_links", enabled: true, sortOrder: 5, contentJson: {} },
];

function mapTheme(row: RowDataPacket | undefined): OrganizerSiteTheme {
  if (!row) return { ...DEFAULT_THEME };
  return {
    logoUrl: (row.logo_url as string) ?? null,
    faviconUrl: (row.favicon_url as string) ?? null,
    heroImageUrl: (row.hero_image_url as string) ?? null,
    primaryColor: String(row.primary_color || DEFAULT_THEME.primaryColor),
    secondaryColor: String(row.secondary_color || DEFAULT_THEME.secondaryColor),
    accentColor: String(row.accent_color || DEFAULT_THEME.accentColor),
    backgroundColor: String(row.background_color || DEFAULT_THEME.backgroundColor),
    textColor: String(row.text_color || DEFAULT_THEME.textColor),
    fontFamily: String(row.font_family || DEFAULT_THEME.fontFamily),
    buttonRadiusPx: Number(row.button_radius_px ?? DEFAULT_THEME.buttonRadiusPx),
    tagline: (row.tagline as string) ?? null,
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

export async function ensureOrganizerSite(
  pool: Pool,
  organizerId: number,
  opts?: { subdomainHint?: string | null; organizerName?: string | null },
): Promise<number> {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM organizer_sites WHERE organizer_id = ? AND deleted_at IS NULL LIMIT 1`,
    [organizerId],
  );
  if (existing.length) return Number(existing[0].id);

  let subdomain = normalizeEventSubdomain(
    String(opts?.subdomainHint || opts?.organizerName || `org-${organizerId}`),
  );
  if (validateEventSubdomainFormat(subdomain) || subdomain.length < 3) {
    subdomain = `org-${organizerId}`;
  }

  // Ensure unique subdomain
  for (let i = 0; i < 40; i += 1) {
    const candidate = i === 0 ? subdomain : `${subdomain}-${i + 1}`.slice(0, 63);
    const [clash] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM organizer_sites WHERE subdomain = ? LIMIT 1`,
      [candidate],
    );
    if (!clash.length) {
      subdomain = candidate;
      break;
    }
  }

  const [ins] = await pool.query<ResultSetHeader>(
    `INSERT INTO organizer_sites
      (organizer_id, subdomain, status, template_key, locale_default)
     VALUES (?, ?, 'draft', 'general_v1', 'es')`,
    [organizerId, subdomain],
  );
  const siteId = Number(ins.insertId);

  await pool.query(
    `INSERT INTO organizer_site_themes
      (organizer_site_id, primary_color, secondary_color, accent_color, background_color, text_color, font_family, button_radius_px, tagline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      siteId,
      DEFAULT_THEME.primaryColor,
      DEFAULT_THEME.secondaryColor,
      DEFAULT_THEME.accentColor,
      DEFAULT_THEME.backgroundColor,
      DEFAULT_THEME.textColor,
      DEFAULT_THEME.fontFamily,
      DEFAULT_THEME.buttonRadiusPx,
      opts?.organizerName ? `${opts.organizerName}` : null,
    ],
  );

  for (const section of DEFAULT_SECTIONS) {
    await pool.query(
      `INSERT INTO organizer_site_sections
        (organizer_site_id, section_key, enabled, sort_order, content_json)
       VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
      [
        siteId,
        section.sectionKey,
        section.enabled ? 1 : 0,
        section.sortOrder,
        JSON.stringify(section.contentJson),
      ],
    );
  }

  return siteId;
}

export async function loadOrganizerSiteById(
  pool: Pool,
  siteId: number,
  opts?: { includeUnpublishedEvents?: boolean },
): Promise<OrganizerSitePayload | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.organizer_id, s.subdomain, s.status, s.template_key, s.locale_default,
            o.name AS organizer_name, o.slug AS organizer_slug, o.logo_url AS organizer_logo
     FROM organizer_sites s
     JOIN organizers o ON o.id = s.organizer_id
     WHERE s.id = ? AND s.deleted_at IS NULL
     LIMIT 1`,
    [siteId],
  );
  if (!rows.length) return null;
  return hydrateSite(pool, rows[0], {
    includeUnpublishedEvents: opts?.includeUnpublishedEvents !== false,
  });
}

export async function loadOrganizerSiteBySubdomain(
  pool: Pool,
  rawSubdomain: string,
  opts?: { publishedOnly?: boolean },
): Promise<OrganizerSitePayload | null> {
  const subdomain = normalizeEventSubdomain(rawSubdomain);
  if (!subdomain || validateEventSubdomainFormat(subdomain)) return null;

  const publishedOnly = opts?.publishedOnly !== false;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.organizer_id, s.subdomain, s.status, s.template_key, s.locale_default,
            o.name AS organizer_name, o.slug AS organizer_slug, o.logo_url AS organizer_logo
     FROM organizer_sites s
     JOIN organizers o ON o.id = s.organizer_id
     WHERE s.subdomain = ?
       AND s.deleted_at IS NULL
       AND o.deleted_at IS NULL
       ${publishedOnly ? "AND s.status = 'published'" : ""}
     LIMIT 1`,
    [subdomain],
  );
  if (!rows.length) return null;
  return hydrateSite(pool, rows[0], {
    // Public vanity host must never leak draft / pending_approval events.
    includeUnpublishedEvents: !publishedOnly,
  });
}

async function hydrateSite(
  pool: Pool,
  row: RowDataPacket,
  opts?: { includeUnpublishedEvents?: boolean },
): Promise<OrganizerSitePayload> {
  const siteId = Number(row.id);
  const organizerId = Number(row.organizer_id);
  const includeUnpublishedEvents = opts?.includeUnpublishedEvents === true;
  const [themes] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM organizer_site_themes WHERE organizer_site_id = ? LIMIT 1`,
    [siteId],
  );
  const theme = mapTheme(themes[0]);
  if (!theme.logoUrl && row.organizer_logo) {
    theme.logoUrl = String(row.organizer_logo);
  }

  const [sections] = await pool.query<RowDataPacket[]>(
    `SELECT section_key, enabled, sort_order, content_json
     FROM organizer_site_sections
     WHERE organizer_site_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [siteId],
  );

  const [legal] = await pool.query<RowDataPacket[]>(
    `SELECT document_key, locale, title, body_html
     FROM organizer_site_legal_documents
     WHERE organizer_site_id = ?
     ORDER BY document_key, locale`,
    [siteId],
  );

  const events = await listOrganizerMicrositeEvents(pool, organizerId, {
    includeUnpublished: includeUnpublishedEvents,
  });

  return {
    id: siteId,
    organizerId,
    organizerName: String(row.organizer_name),
    organizerSlug: String(row.organizer_slug),
    subdomain: String(row.subdomain),
    status: String(row.status),
    templateKey: String(row.template_key),
    localeDefault: String(row.locale_default || "es"),
    theme,
    sections: sections.map((s) => ({
      sectionKey: String(s.section_key),
      enabled: Boolean(s.enabled),
      sortOrder: Number(s.sort_order),
      contentJson: parseJsonObject(s.content_json),
    })),
    legal: legal.map((d) => ({
      documentKey: String(d.document_key),
      locale: String(d.locale),
      title: String(d.title),
      bodyHtml: String(d.body_html),
    })),
    events,
  };
}

export async function loadOrganizerSiteForOrganizer(
  pool: Pool,
  organizerId: number,
): Promise<OrganizerSitePayload | null> {
  const siteId = await ensureOrganizerSite(pool, organizerId);
  return loadOrganizerSiteById(pool, siteId, { includeUnpublishedEvents: true });
}

export type SitePatchBody = {
  subdomain?: string;
  status?: "draft" | "published" | "suspended";
  localeDefault?: "es" | "en";
  theme?: Partial<OrganizerSiteTheme>;
  sections?: Array<{
    sectionKey: string;
    enabled?: boolean;
    sortOrder?: number;
    contentJson?: Record<string, unknown>;
  }>;
  legal?: Array<{
    documentKey: "terms" | "privacy" | "refund";
    locale: "es" | "en";
    title: string;
    bodyHtml: string;
  }>;
};

export async function patchOrganizerSite(
  pool: Pool,
  siteId: number,
  body: SitePatchBody,
): Promise<OrganizerSitePayload | null> {
  if (body.subdomain != null) {
    const subdomain = normalizeEventSubdomain(body.subdomain);
    const formatErr = validateEventSubdomainFormat(subdomain);
    if (formatErr) throw new Error(`subdomain_${formatErr}`);
    const [clash] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM organizer_sites WHERE subdomain = ? AND id <> ? LIMIT 1`,
      [subdomain, siteId],
    );
    if (clash.length) throw new Error("subdomain_taken");
    await pool.query(`UPDATE organizer_sites SET subdomain = ? WHERE id = ?`, [
      subdomain,
      siteId,
    ]);
  }

  if (body.status) {
    await pool.query(
      `UPDATE organizer_sites
       SET status = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END
       WHERE id = ?`,
      [body.status, body.status, siteId],
    );
  }

  if (body.localeDefault) {
    await pool.query(
      `UPDATE organizer_sites SET locale_default = ? WHERE id = ?`,
      [body.localeDefault, siteId],
    );
  }

  if (body.theme) {
    const t = body.theme;
    await pool.query(
      `UPDATE organizer_site_themes SET
         logo_url = COALESCE(?, logo_url),
         favicon_url = COALESCE(?, favicon_url),
         hero_image_url = COALESCE(?, hero_image_url),
         primary_color = COALESCE(?, primary_color),
         secondary_color = COALESCE(?, secondary_color),
         accent_color = COALESCE(?, accent_color),
         background_color = COALESCE(?, background_color),
         text_color = COALESCE(?, text_color),
         font_family = COALESCE(?, font_family),
         button_radius_px = COALESCE(?, button_radius_px),
         tagline = COALESCE(?, tagline)
       WHERE organizer_site_id = ?`,
      [
        t.logoUrl ?? null,
        t.faviconUrl ?? null,
        t.heroImageUrl ?? null,
        t.primaryColor ?? null,
        t.secondaryColor ?? null,
        t.accentColor ?? null,
        t.backgroundColor ?? null,
        t.textColor ?? null,
        t.fontFamily ?? null,
        t.buttonRadiusPx ?? null,
        t.tagline ?? null,
        siteId,
      ],
    );
  }

  if (body.sections?.length) {
    for (const section of body.sections) {
      await pool.query(
        `INSERT INTO organizer_site_sections
          (organizer_site_id, section_key, enabled, sort_order, content_json)
         VALUES (?, ?, ?, ?, CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE
           enabled = VALUES(enabled),
           sort_order = VALUES(sort_order),
           content_json = VALUES(content_json)`,
        [
          siteId,
          section.sectionKey,
          section.enabled === false ? 0 : 1,
          section.sortOrder ?? 0,
          JSON.stringify(section.contentJson ?? {}),
        ],
      );
    }
  }

  if (body.legal?.length) {
    for (const doc of body.legal) {
      await pool.query(
        `INSERT INTO organizer_site_legal_documents
          (organizer_site_id, document_key, locale, title, body_html)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           body_html = VALUES(body_html)`,
        [siteId, doc.documentKey, doc.locale, doc.title, doc.bodyHtml],
      );
    }
  }

  return loadOrganizerSiteById(pool, siteId);
}

export function registerOrganizerSiteRoutes(
  app: Express,
  deps: {
    pool: Pool;
    requireOrganizer: any;
    requireAdmin: any;
    asyncHandler: any;
  },
) {
  const { pool, requireOrganizer, requireAdmin, asyncHandler } = deps;

  app.get(
    "/api/sites/by-subdomain/:subdomain",
    asyncHandler(async (req: Request, res: Response) => {
      const site = await loadOrganizerSiteBySubdomain(
        pool,
        String(req.params.subdomain || ""),
        { publishedOnly: true },
      );
      if (!site) return res.status(404).json({ error: "site_not_found" });
      res.json({ site });
    }),
  );

  app.get(
    "/api/organizer/site",
    requireOrganizer,
    asyncHandler(async (req: any, res: Response) => {
      const organizerId = Number(req.auth?.organizerId);
      if (!organizerId) return res.status(401).json({ error: "unauthorized" });
      const [org] = await pool.query<RowDataPacket[]>(
        `SELECT name FROM organizers WHERE id = ? LIMIT 1`,
        [organizerId],
      );
      await ensureOrganizerSite(pool, organizerId, {
        organizerName: org[0]?.name as string | undefined,
      });
      const site = await loadOrganizerSiteForOrganizer(pool, organizerId);
      res.json({ site });
    }),
  );

  app.patch(
    "/api/organizer/site",
    requireOrganizer,
    asyncHandler(async (req: any, res: Response) => {
      const organizerId = Number(req.auth?.organizerId);
      if (!organizerId) return res.status(401).json({ error: "unauthorized" });
      const siteId = await ensureOrganizerSite(pool, organizerId);
      try {
        const site = await patchOrganizerSite(pool, siteId, req.body || {});
        res.json({ site });
      } catch (e: any) {
        const msg = String(e?.message || "update_failed");
        if (msg.startsWith("subdomain_")) {
          return res.status(400).json({ error: msg });
        }
        if (msg === "subdomain_taken") {
          return res.status(409).json({ error: msg });
        }
        throw e;
      }
    }),
  );

  app.get(
    "/api/admin/organizers/:organizerId/site",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const organizerId = Number(req.params.organizerId);
      if (!organizerId) return res.status(400).json({ error: "invalid_organizer" });
      const [org] = await pool.query<RowDataPacket[]>(
        `SELECT name FROM organizers WHERE id = ? LIMIT 1`,
        [organizerId],
      );
      if (!org.length) return res.status(404).json({ error: "organizer_not_found" });
      await ensureOrganizerSite(pool, organizerId, {
        organizerName: org[0].name as string,
      });
      const site = await loadOrganizerSiteForOrganizer(pool, organizerId);
      res.json({ site });
    }),
  );

  app.patch(
    "/api/admin/organizers/:organizerId/site",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const organizerId = Number(req.params.organizerId);
      if (!organizerId) return res.status(400).json({ error: "invalid_organizer" });
      const siteId = await ensureOrganizerSite(pool, organizerId);
      try {
        const site = await patchOrganizerSite(pool, siteId, req.body || {});
        res.json({ site });
      } catch (e: any) {
        const msg = String(e?.message || "update_failed");
        if (msg.startsWith("subdomain_") || msg === "subdomain_taken") {
          return res.status(msg === "subdomain_taken" ? 409 : 400).json({ error: msg });
        }
        throw e;
      }
    }),
  );
}
