import type { Express, Request, RequestHandler, Response } from "express";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { Resend } from "resend";
import type { CreateContactOptions } from "resend";
import type {
  CreateEventBroadcastRequest,
  EventBroadcastAudienceResponse,
  EventBroadcastListResponse,
  EventBroadcastPreviewRequest,
  EventBroadcastPreviewResponse,
  EventBroadcastRow,
  EventBroadcastSendResponse,
  EventBroadcastTemplatesResponse,
} from "../shared/api.js";
import {
  buildOrganizerBroadcastFrom,
  buildEventBroadcastEmail,
} from "../shared/eventBroadcastEmail.js";
import {
  buildEventBroadcastTemplate,
  EVENT_BROADCAST_TEMPLATE_KEYS,
  type EventBroadcastTemplateKey,
} from "../shared/eventBroadcasts.js";
import { canOrganizerEditEvents } from "../shared/staffRoles.js";
import {
  assertMemberCanAccessEvent,
  getOrganizerMemberRole,
} from "./staffPortal.js";
import { fetchResendEventUpdatesTopicId } from "./platformSettings.js";

type ActorType = "organizer" | "admin";

interface AuthedRequest extends Request {
  auth?: {
    actor: ActorType | "athlete";
    id: number;
    organizerId?: number;
  };
}

export interface EventBroadcastDeps {
  pool: Pool;
  requireOrganizer: RequestHandler;
  requireAdmin: RequestHandler;
  resend: Resend | null;
  fromEmail: string;
  appUrl: string;
  newPublicUuid: () => string;
  normalizeLocale: (value?: string | null) => "es" | "en";
}

type EventContext = {
  eventId: number;
  organizerId: number;
  organizerName: string;
  eventTitle: string;
  eventStartDate: Date;
  eventLocation: string | null;
  segmentId: string | null;
  locale: "es" | "en";
};

function parseEventId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function routeEventId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseEventId(value ?? "");
}

function mapBroadcastRow(row: RowDataPacket): EventBroadcastRow {
  return {
    id: Number(row.id),
    publicUuid: String(row.public_uuid),
    eventId: Number(row.event_id),
    organizerId: Number(row.organizer_id),
    audienceType: "confirmed",
    templateKey: row.template_key ? String(row.template_key) : null,
    subject: String(row.subject),
    contentHtml: String(row.content_html),
    fromDisplay: String(row.from_display),
    status: row.status,
    sendMode: row.send_mode,
    scheduledAt: row.scheduled_at
      ? new Date(row.scheduled_at).toISOString()
      : null,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    recipientCount: Number(row.recipient_count ?? 0),
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: new Date(row.created_at).toISOString(),
    createdByMemberId: row.created_by_member_id
      ? Number(row.created_by_member_id)
      : null,
    createdByAdminId: row.created_by_admin_id
      ? Number(row.created_by_admin_id)
      : null,
  };
}

async function loadEventContext(
  pool: Pool,
  eventId: number,
  locale: "es" | "en",
): Promise<EventContext | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id, e.organizer_id, e.title, e.start_date, e.location_name, e.location_city,
            e.resend_confirmed_segment_id, o.name AS organizer_name
     FROM events e
     JOIN organizers o ON o.id = e.organizer_id AND o.deleted_at IS NULL
     WHERE e.id = ? AND e.deleted_at IS NULL
     LIMIT 1`,
    [eventId],
  );
  const row = rows[0];
  if (!row) return null;

  const locationParts = [row.location_name, row.location_city].filter(Boolean);
  const eventDateLabel = new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : "es-MX",
    { dateStyle: "full", timeStyle: "short" },
  ).format(new Date(row.start_date));

  return {
    eventId,
    organizerId: Number(row.organizer_id),
    organizerName: String(row.organizer_name),
    eventTitle: String(row.title),
    eventStartDate: new Date(row.start_date),
    eventLocation: locationParts.length
      ? locationParts.join(", ")
      : null,
    segmentId: row.resend_confirmed_segment_id
      ? String(row.resend_confirmed_segment_id)
      : null,
    locale,
  };
}

async function countConfirmedAudience(pool: Pool, eventId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM registrations r
     JOIN athletes a ON a.id = r.athlete_id AND a.deleted_at IS NULL
     WHERE r.event_id = ? AND r.status = 'confirmed' AND r.deleted_at IS NULL
       AND a.email IS NOT NULL AND TRIM(a.email) <> ''`,
    [eventId],
  );
  return Number(rows[0]?.c ?? 0);
}

async function refreshAudienceCache(
  pool: Pool,
  eventId: number,
): Promise<{ count: number; staleSegmentEmails: string[] }> {
  const [registrants] = await pool.query<RowDataPacket[]>(
    `SELECT r.athlete_id, a.email, a.first_name, a.last_name
     FROM registrations r
     JOIN athletes a ON a.id = r.athlete_id AND a.deleted_at IS NULL
     WHERE r.event_id = ? AND r.status = 'confirmed' AND r.deleted_at IS NULL
       AND a.email IS NOT NULL AND TRIM(a.email) <> ''`,
    [eventId],
  );

  await pool.query(
    `UPDATE event_broadcast_audience SET is_active = 0 WHERE event_id = ?`,
    [eventId],
  );

  const staleSegmentEmails: string[] = [];

  if (registrants.length === 0) {
    return { count: 0, staleSegmentEmails };
  }

  for (const reg of registrants) {
    const email = String(reg.email).trim().toLowerCase();
    const athleteId = Number(reg.athlete_id);

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT email, in_resend_segment FROM event_broadcast_audience
       WHERE event_id = ? AND athlete_id = ? LIMIT 1`,
      [eventId, athleteId],
    );
    const prior = existing[0];
    if (
      prior &&
      prior.in_resend_segment &&
      String(prior.email).toLowerCase() !== email
    ) {
      staleSegmentEmails.push(String(prior.email).toLowerCase());
    }

    await pool.query(
      `INSERT INTO event_broadcast_audience
         (event_id, athlete_id, email, first_name, last_name, is_active, in_resend_segment)
       VALUES (?, ?, ?, ?, ?, 1, 0)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         first_name = VALUES(first_name),
         last_name = VALUES(last_name),
         is_active = 1,
         in_resend_segment = IF(LOWER(email) <> VALUES(email), 0, in_resend_segment)`,
      [
        eventId,
        athleteId,
        email,
        reg.first_name ?? null,
        reg.last_name ?? null,
      ],
    );
  }

  return { count: registrants.length, staleSegmentEmails };
}

async function ensureResendSegment(
  deps: EventBroadcastDeps,
  ctx: EventContext,
): Promise<string> {
  if (!deps.resend) {
    throw new Error("RESEND_API_KEY not configured");
  }

  if (ctx.segmentId) {
    return ctx.segmentId;
  }

  const name = `atleita-event-${ctx.eventId}-confirmed`;
  const created = await deps.resend.segments.create({ name });
  if (created.error || !created.data?.id) {
    throw new Error(created.error?.message ?? "Failed to create Resend segment");
  }

  const segmentId = created.data.id;
  await deps.pool.query(
    `UPDATE events SET resend_confirmed_segment_id = ? WHERE id = ?`,
    [segmentId, ctx.eventId],
  );
  ctx.segmentId = segmentId;
  return segmentId;
}

async function syncSegmentContacts(
  deps: EventBroadcastDeps,
  eventId: number,
  segmentId: string,
  staleSegmentEmails: string[] = [],
  topicId: string | null,
): Promise<{ synced: number; removed: number }> {
  if (!deps.resend) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const [pendingAdd] = await deps.pool.query<RowDataPacket[]>(
    `SELECT email, first_name, last_name FROM event_broadcast_audience
     WHERE event_id = ? AND is_active = 1 AND in_resend_segment = 0`,
    [eventId],
  );

  const [pendingRemove] = await deps.pool.query<RowDataPacket[]>(
    `SELECT email FROM event_broadcast_audience
     WHERE event_id = ? AND is_active = 0 AND in_resend_segment = 1`,
    [eventId],
  );

  let synced = 0;
  for (const row of pendingAdd) {
    const email = String(row.email).trim().toLowerCase();
    const createPayload: CreateContactOptions = {
      email,
      firstName: row.first_name ? String(row.first_name) : undefined,
      lastName: row.last_name ? String(row.last_name) : undefined,
      segments: [{ id: segmentId }],
    };
    if (topicId) {
      createPayload.topics = [{ id: topicId, subscription: "opt_in" }];
    }

    const created = await deps.resend.contacts.create(createPayload);
    if (created.error) {
      // Contact may already exist — try adding to segment
      const added = await deps.resend.contacts.segments.add({
        email,
        segmentId,
      });
      if (added.error) {
        throw new Error(added.error.message ?? "Failed to sync contact");
      }
      if (topicId) {
        await deps.resend.contacts.topics.update({
          email,
          topics: [{ id: topicId, subscription: "opt_in" }],
        });
      }
    }

    await deps.pool.query(
      `UPDATE event_broadcast_audience SET in_resend_segment = 1
       WHERE event_id = ? AND email = ?`,
      [eventId, email],
    );
    synced += 1;
  }

  let removed = 0;
  const emailsToRemove = new Set(
    [
      ...pendingRemove.map((row) => String(row.email).trim().toLowerCase()),
      ...staleSegmentEmails.map((e) => e.trim().toLowerCase()),
    ].filter(Boolean),
  );
  for (const email of emailsToRemove) {
    const result = await deps.resend.contacts.segments.remove({
      email,
      segmentId,
    });
    if (!result.error) {
      removed += 1;
    }
    await deps.pool.query(
      `UPDATE event_broadcast_audience SET in_resend_segment = 0
       WHERE event_id = ? AND LOWER(email) = ?`,
      [eventId, email],
    );
  }

  return { synced, removed };
}

function buildRenderedHtml(
  deps: EventBroadcastDeps,
  ctx: EventContext,
  input: {
    subject: string;
    preheader: string;
    title: string;
    contentHtml: string;
  },
): string {
  return buildEventBroadcastEmail({
    locale: ctx.locale,
    preheader: input.preheader,
    title: input.title,
    bodyHtml: input.contentHtml,
    organizerName: ctx.organizerName,
    appUrl: deps.appUrl,
    previewMode: false,
  });
}

function resolveTemplateTitle(
  templateKey: string | null | undefined,
  subject: string,
): string {
  if (!templateKey) return subject;
  return subject;
}

async function createAndSendBroadcast(
  deps: EventBroadcastDeps,
  ctx: EventContext,
  input: {
    subject: string;
    contentHtml: string;
    preheader: string;
    title: string;
    templateKey: string | null;
    sendMode: "now" | "scheduled";
    scheduledAt: string | null;
    createdByMemberId: number | null;
    createdByAdminId: number | null;
  },
): Promise<EventBroadcastSendResponse> {
  if (!deps.resend) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const { count: recipientCount, staleSegmentEmails } =
    await refreshAudienceCache(deps.pool, ctx.eventId);
  if (recipientCount === 0) {
    throw new Error("No confirmed registrants with email for this event");
  }

  const segmentId = await ensureResendSegment(deps, ctx);
  const topicId = await fetchResendEventUpdatesTopicId(deps.pool);
  await syncSegmentContacts(
    deps,
    ctx.eventId,
    segmentId,
    staleSegmentEmails,
    topicId,
  );

  const fromDisplay = buildOrganizerBroadcastFrom(
    ctx.organizerName,
    deps.fromEmail,
  );
  const renderedHtml = buildRenderedHtml(deps, ctx, {
    subject: input.subject,
    preheader: input.preheader,
    title: input.title,
    contentHtml: input.contentHtml,
  });

  const publicUuid = deps.newPublicUuid();
  const broadcastName = `${ctx.eventTitle} — ${input.subject}`.slice(0, 250);

  const createOpts: Parameters<Resend["broadcasts"]["create"]>[0] = {
    name: broadcastName,
    segmentId,
    from: fromDisplay,
    subject: input.subject,
    html: renderedHtml,
    previewText: input.preheader,
    topicId: topicId ?? undefined,
    send: true,
  };

  if (input.sendMode === "scheduled" && input.scheduledAt) {
    createOpts.scheduledAt = input.scheduledAt;
  }

  const created = await deps.resend.broadcasts.create(createOpts);
  if (created.error || !created.data?.id) {
    const errMsg = created.error?.message ?? "Resend broadcast failed";
    await deps.pool.query<ResultSetHeader>(
      `INSERT INTO event_broadcasts
         (public_uuid, event_id, organizer_id, created_by_member_id, created_by_admin_id,
          audience_type, template_key, subject, content_html, rendered_html, from_display,
          resend_broadcast_id, resend_segment_id, status, send_mode, scheduled_at,
          recipient_count, error_message)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, NULL, ?, 'failed', ?, ?, ?, ?)`,
      [
        publicUuid,
        ctx.eventId,
        ctx.organizerId,
        input.createdByMemberId,
        input.createdByAdminId,
        input.templateKey,
        input.subject,
        input.contentHtml,
        renderedHtml,
        fromDisplay,
        segmentId,
        input.sendMode,
        input.scheduledAt ? new Date(input.scheduledAt) : null,
        recipientCount,
        errMsg.slice(0, 500),
      ],
    );
    throw new Error(errMsg);
  }

  const status = input.sendMode === "scheduled" ? "scheduled" : "sent";
  const sentAt = input.sendMode === "now" ? new Date() : null;

  const [insert] = await deps.pool.query<ResultSetHeader>(
    `INSERT INTO event_broadcasts
       (public_uuid, event_id, organizer_id, created_by_member_id, created_by_admin_id,
        audience_type, template_key, subject, content_html, rendered_html, from_display,
        resend_broadcast_id, resend_segment_id, status, send_mode, scheduled_at, sent_at,
        recipient_count)
     VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      publicUuid,
      ctx.eventId,
      ctx.organizerId,
      input.createdByMemberId,
      input.createdByAdminId,
      input.templateKey,
      input.subject,
      input.contentHtml,
      renderedHtml,
      fromDisplay,
      created.data.id,
      segmentId,
      status,
      input.sendMode,
      input.scheduledAt ? new Date(input.scheduledAt) : null,
      sentAt,
      recipientCount,
    ],
  );

  const [rows] = await deps.pool.query<RowDataPacket[]>(
    `SELECT * FROM event_broadcasts WHERE id = ? LIMIT 1`,
    [insert.insertId],
  );

  return {
    broadcast: mapBroadcastRow(rows[0]),
    recipientCount,
  };
}

function registerBroadcastRoutes(
  app: Express,
  deps: EventBroadcastDeps,
  basePath: "organizer" | "admin",
  requireAuth: RequestHandler,
): void {
  const prefix = `/api/${basePath}/events/:eventId/broadcasts`;

  async function authorizeOrganizerBroadcast(
    req: AuthedRequest,
    res: Response,
    eventId: number,
  ): Promise<{ ok: true; ctx: EventContext } | { ok: false }> {
    const locale = deps.normalizeLocale(
      typeof req.headers["accept-language"] === "string"
        ? req.headers["accept-language"]
        : undefined,
    );
    const ctx = await loadEventContext(deps.pool, eventId, locale);
    if (!ctx) {
      res.status(404).json({ error: "Event not found" });
      return { ok: false };
    }

    if (basePath === "organizer") {
      const organizerId = req.auth!.organizerId;
      if (!organizerId || organizerId !== ctx.organizerId) {
        res.status(404).json({ error: "Event not found" });
        return { ok: false };
      }
      const role = await getOrganizerMemberRole(
        deps.pool,
        req.auth!.id,
        organizerId,
      );
      if (!role || !canOrganizerEditEvents(role)) {
        res.status(403).json({ error: "Insufficient permissions" });
        return { ok: false };
      }
      if (
        !(await assertMemberCanAccessEvent(
          deps.pool,
          req.auth!.id,
          organizerId,
          eventId,
        ))
      ) {
        res.status(404).json({ error: "Event not found" });
        return { ok: false };
      }
    }

    return { ok: true, ctx };
  }

  app.get(`${prefix}`, requireAuth, async (req: AuthedRequest, res) => {
    const eventId = routeEventId(req.params.eventId);
    if (!eventId) return res.status(400).json({ error: "Invalid event id" });

    const auth = await authorizeOrganizerBroadcast(req, res, eventId);
    if (!auth.ok) return;

    const [rows] = await deps.pool.query<RowDataPacket[]>(
      `SELECT * FROM event_broadcasts WHERE event_id = ? ORDER BY created_at DESC LIMIT 50`,
      [eventId],
    );
    res.json({
      broadcasts: rows.map(mapBroadcastRow),
    } satisfies EventBroadcastListResponse);
  });

  app.get(`${prefix}/audience`, requireAuth, async (req: AuthedRequest, res) => {
    const eventId = routeEventId(req.params.eventId);
    if (!eventId) return res.status(400).json({ error: "Invalid event id" });

    const auth = await authorizeOrganizerBroadcast(req, res, eventId);
    if (!auth.ok) return;

    const count = await countConfirmedAudience(deps.pool, eventId);
    res.json({
      audienceType: "confirmed",
      recipientCount: count,
    } satisfies EventBroadcastAudienceResponse);
  });

  app.get(`${prefix}/templates`, requireAuth, async (req: AuthedRequest, res) => {
    const eventId = routeEventId(req.params.eventId);
    if (!eventId) return res.status(400).json({ error: "Invalid event id" });

    const auth = await authorizeOrganizerBroadcast(req, res, eventId);
    if (!auth.ok) return;

    const templates = EVENT_BROADCAST_TEMPLATE_KEYS.map((key) => ({
      key,
      ...buildEventBroadcastTemplate(key, auth.ctx.locale, {
        eventTitle: auth.ctx.eventTitle,
        organizerName: auth.ctx.organizerName,
        eventDateLabel: new Intl.DateTimeFormat(
          auth.ctx.locale === "en" ? "en-US" : "es-MX",
          { dateStyle: "full", timeStyle: "short" },
        ).format(auth.ctx.eventStartDate),
        eventLocation: auth.ctx.eventLocation,
      }),
    }));

    res.json({ templates } satisfies EventBroadcastTemplatesResponse);
  });

  app.post(`${prefix}/preview`, requireAuth, async (req: AuthedRequest, res) => {
    const eventId = routeEventId(req.params.eventId);
    if (!eventId) return res.status(400).json({ error: "Invalid event id" });

    const auth = await authorizeOrganizerBroadcast(req, res, eventId);
    if (!auth.ok) return;

    const body = (req.body ?? {}) as EventBroadcastPreviewRequest;
    const subject = String(body.subject ?? "").trim();
    const contentHtml = String(body.contentHtml ?? "").trim();
    const preheader = String(body.preheader ?? subject).trim();
    const title = String(body.title ?? subject).trim();
    if (!subject || !contentHtml) {
      return res.status(400).json({ error: "subject and contentHtml required" });
    }

    const html = buildEventBroadcastEmail({
      locale: auth.ctx.locale,
      preheader,
      title,
      bodyHtml: contentHtml,
      organizerName: auth.ctx.organizerName,
      appUrl: deps.appUrl,
      previewMode: true,
    });
    const fromDisplay = buildOrganizerBroadcastFrom(
      auth.ctx.organizerName,
      deps.fromEmail,
    );

    res.json({
      html,
      fromDisplay,
      subject,
    } satisfies EventBroadcastPreviewResponse);
  });

  app.post(`${prefix}`, requireAuth, async (req: AuthedRequest, res) => {
    const eventId = routeEventId(req.params.eventId);
    if (!eventId) return res.status(400).json({ error: "Invalid event id" });

    const auth = await authorizeOrganizerBroadcast(req, res, eventId);
    if (!auth.ok) return;

    const body = (req.body ?? {}) as CreateEventBroadcastRequest;
    const subject = String(body.subject ?? "").trim();
    const contentHtml = String(body.contentHtml ?? "").trim();
    const preheader = String(body.preheader ?? subject).trim();
    const title = String(body.title ?? resolveTemplateTitle(body.templateKey, subject)).trim();
    const sendMode = body.sendMode === "scheduled" ? "scheduled" : "now";
    const scheduledAt =
      sendMode === "scheduled" && body.scheduledAt
        ? new Date(body.scheduledAt)
        : null;

    if (!subject || subject.length > 500) {
      return res.status(400).json({ error: "subject required (max 500)" });
    }
    if (!contentHtml) {
      return res.status(400).json({ error: "contentHtml required" });
    }
    if (sendMode === "scheduled") {
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ error: "scheduledAt required for scheduled send" });
      }
      if (scheduledAt.getTime() <= Date.now() + 60_000) {
        return res.status(400).json({ error: "scheduledAt must be at least 1 minute in the future" });
      }
    }

    let createdByMemberId: number | null = null;
    let createdByAdminId: number | null = null;
    if (basePath === "organizer") {
      createdByMemberId = req.auth?.id ?? null;
    } else if (basePath === "admin") {
      createdByAdminId = req.auth?.id ?? null;
    }

    try {
      const result = await createAndSendBroadcast(deps, auth.ctx, {
        subject,
        contentHtml,
        preheader,
        title,
        templateKey: body.templateKey ?? null,
        sendMode,
        scheduledAt: scheduledAt?.toISOString() ?? null,
        createdByMemberId,
        createdByAdminId,
      });
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: message });
    }
  });
}

export function registerEventBroadcastRoutes(
  app: Express,
  deps: EventBroadcastDeps,
): void {
  registerBroadcastRoutes(app, deps, "organizer", deps.requireOrganizer);
  registerBroadcastRoutes(app, deps, "admin", deps.requireAdmin);
}
