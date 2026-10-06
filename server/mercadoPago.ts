/**
 * Mercado Pago marketplace (Split 1:1) — OAuth, preferences, payments, refunds, webhooks.
 * Uses REST fetch (no SDK) for Vercel serverless compatibility.
 */
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { isPayoutRail, type PayoutRail } from "../shared/payoutRail.js";

/** Historical MP OAuth status (organizer mp_* columns removed from product schema). */
type MercadoPagoOauthStatus =
  | "not_started"
  | "pending"
  | "ready"
  | "revoked"
  | "error";

function isMercadoPagoReady(
  status: MercadoPagoOauthStatus | string | null | undefined,
): boolean {
  return status === "ready";
}

function logMp(level: "warn" | "error", msg: string, err?: unknown) {
  if (level === "warn") console.warn(msg, err);
  else console.error(msg, err);
}

const MP_API = "https://api.mercadopago.com";
const MP_AUTH_MX = "https://auth.mercadopago.com.mx/authorization";
/** OAuth authorization codes expire in ~10 minutes; keep state shorter. */
const OAUTH_STATE_TTL_MS = 12 * 60 * 1000;
/** OXXO / ticket vouchers typically expire in ~3 days; fail open pending after this. */
export const MP_PENDING_PAYMENT_TTL_DAYS = 4;

type AuthedRequest = Request & {
  auth?: { id: number; organizerId?: number; role?: string };
};

function appUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
}

export function isMercadoPagoConfigured(): boolean {
  // Atleita v1: Stripe only (MP stubbed).
  return false;
}

export function mpPlatformPublicKey(): string | null {
  return process.env.MP_PLATFORM_PUBLIC_KEY?.trim() || null;
}

export function mpWebhookSecret(): string | null {
  return process.env.MP_WEBHOOK_SECRET?.trim() || null;
}

/** Sandbox/test OAuth tokens — set MP_OAUTH_TEST_TOKEN=true or VITE_APP_ENV=sandbox. */
export function mpOauthUsesTestToken(): boolean {
  const flag = process.env.MP_OAUTH_TEST_TOKEN?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const env = (
    process.env.VITE_APP_ENV ||
    process.env.APP_ENV ||
    ""
  ).toLowerCase();
  return env === "sandbox" || env === "test";
}

function encryptionKey(): Buffer {
  const raw =
    process.env.MP_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "atleita-mp-dev-key-change-me!!";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSecret(
  payload: string | null | undefined,
): string | null {
  if (!payload) return null;
  if (!payload.startsWith("v1:")) return payload;
  const [, ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Validate Mercado Pago webhook x-signature (HMAC-SHA256 manifest).
 * @see https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
export function validateMpWebhookSignature(opts: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  secret: string;
}): boolean {
  const signature = opts.xSignature?.trim();
  const requestId = opts.xRequestId?.trim();
  const dataId = opts.dataId?.trim();
  if (!signature || !requestId || !dataId || !opts.secret) return false;

  let ts = "";
  let hash = "";
  for (const part of signature.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    if (key === "v1") hash = value;
  }
  if (!ts || !hash) return false;

  // Reject stamps older than 10 minutes (replay window).
  const tsNum = Number(ts);
  if (Number.isFinite(tsNum)) {
    const ageMs = Math.abs(Date.now() - tsNum * 1000);
    if (ageMs > 10 * 60 * 1000) return false;
  }

  // MP docs: alphanumeric data.id must be lowercase in the manifest.
  const dataIdVariants = /^[0-9]+$/.test(dataId)
    ? [dataId]
    : Array.from(new Set([dataId.toLowerCase(), dataId]));

  for (const idForManifest of dataIdVariants) {
    const manifest = `id:${idForManifest};request-id:${requestId};ts:${ts};`;
    const computed = crypto
      .createHmac("sha256", opts.secret)
      .update(manifest)
      .digest("hex");
    if (timingSafeEqualHex(computed, hash)) return true;
  }
  return false;
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

async function mpFetch<T>(
  path: string,
  opts: {
    method?: string;
    accessToken: string;
    body?: unknown;
    formUrlEncoded?: Record<string, string>;
    idempotencyKey?: string;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.accessToken}`,
    Accept: "application/json",
  };
  if (opts.idempotencyKey) {
    headers["X-Idempotency-Key"] = opts.idempotencyKey.slice(0, 64);
  }
  let body: string | undefined;
  if (opts.formUrlEncoded) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.formUrlEncoded).toString();
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${MP_API}${path}`, {
    method: opts.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Mercado Pago HTTP ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json as T;
}

export type OrganizerMpRow = {
  id: number;
  payout_rail: PayoutRail;
  mp_user_id: string | null;
  mp_access_token_enc: string | null;
  mp_refresh_token_enc: string | null;
  mp_token_expires_at: Date | string | null;
  mp_public_key: string | null;
  mp_oauth_status: MercadoPagoOauthStatus;
  mp_oauth_connected_at: Date | string | null;
  mp_oauth_last_synced_at: Date | string | null;
  mp_oauth_state_nonce?: string | null;
  mp_oauth_state_expires_at?: Date | string | null;
  mp_oauth_code_verifier_enc?: string | null;
  legal_name: string | null;
  billing_email: string | null;
  rfc: string | null;
  payout_terms_accepted_at: Date | string | null;
  payout_fee_acknowledged_at: Date | string | null;
};

/**
 * Organizer MP OAuth columns were dropped. Returns a revoked stub so callers
 * fail closed without querying removed columns.
 */
export async function loadOrganizerMp(
  pool: Pool,
  organizerId: number,
): Promise<OrganizerMpRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, payout_rail, legal_name, billing_email, rfc,
            payout_terms_accepted_at, payout_fee_acknowledged_at
     FROM organizers WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [organizerId],
  );
  if (!rows[0]) return null;
  return mapOrganizerMpRow(rows[0]);
}

function mapOrganizerMpRow(r: RowDataPacket): OrganizerMpRow {
  return {
    id: Number(r.id),
    payout_rail: isPayoutRail(r.payout_rail) ? r.payout_rail : "stripe",
    mp_user_id: null,
    mp_access_token_enc: null,
    mp_refresh_token_enc: null,
    mp_token_expires_at: null,
    mp_public_key: null,
    mp_oauth_status: "revoked",
    mp_oauth_connected_at: null,
    mp_oauth_last_synced_at: null,
    mp_oauth_state_nonce: null,
    mp_oauth_state_expires_at: null,
    mp_oauth_code_verifier_enc: null,
    legal_name: (r.legal_name as string) ?? null,
    billing_email: (r.billing_email as string) ?? null,
    rfc: (r.rfc as string) ?? null,
    payout_terms_accepted_at: r.payout_terms_accepted_at as
      | Date
      | string
      | null,
    payout_fee_acknowledged_at: r.payout_fee_acknowledged_at as
      | Date
      | string
      | null,
  };
}

export function organizerMpReady(row: OrganizerMpRow): boolean {
  if (!isMercadoPagoReady(row.mp_oauth_status)) return false;
  if (!row.mp_user_id || !row.mp_access_token_enc) return false;
  if (!row.payout_terms_accepted_at || !row.payout_fee_acknowledged_at)
    return false;
  // RFC / tax ID is collected by Mercado Pago during seller onboarding — not Atleita.
  if (!row.legal_name?.trim() || !row.billing_email?.trim()) return false;
  return true;
}

async function markOrganizerMpOauthError(
  _pool: Pool,
  organizerId: number,
): Promise<void> {
  logMp("warn", `[mp] oauth error for organizer ${organizerId} (mp columns removed)`);
}

export async function getSellerAccessToken(
  pool: Pool,
  row: OrganizerMpRow,
): Promise<string> {
  let token = decryptSecret(row.mp_access_token_enc);
  if (!token) {
    await markOrganizerMpOauthError(pool, row.id);
    throw new Error("Mercado Pago seller token missing");
  }

  const expiresAt = row.mp_token_expires_at
    ? new Date(row.mp_token_expires_at).getTime()
    : 0;
  const needsRefresh =
    Boolean(decryptSecret(row.mp_refresh_token_enc)) &&
    (!expiresAt || Date.now() > expiresAt - 60_000);

  if (!needsRefresh) return token;

  const refresh = decryptSecret(row.mp_refresh_token_enc);
  if (!refresh) {
    await markOrganizerMpOauthError(pool, row.id);
    throw new Error("Mercado Pago refresh token missing");
  }

  try {
    const refreshed = await mpFetch<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      public_key?: string;
      user_id?: number;
    }>("/oauth/token", {
      method: "POST",
      accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
      formUrlEncoded: {
        client_id: process.env.MP_CLIENT_ID!,
        client_secret: process.env.MP_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refresh,
      },
    });
    token = refreshed.access_token;
    const expires = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : null;
    if (!refreshed.refresh_token) {
      logMp("warn", "[mp] refresh response missing refresh_token — storing access only");
    }
    await pool.query(
      `UPDATE organizers SET
         mp_access_token_enc = ?,
         mp_refresh_token_enc = COALESCE(?, mp_refresh_token_enc),
         mp_token_expires_at = ?,
         mp_public_key = COALESCE(?, mp_public_key),
         mp_oauth_status = 'ready',
         mp_oauth_last_synced_at = NOW()
       WHERE id = ?`,
      [
        encryptSecret(refreshed.access_token),
        refreshed.refresh_token
          ? encryptSecret(refreshed.refresh_token)
          : null,
        expires,
        refreshed.public_key ?? null,
        row.id,
      ],
    );
    return token;
  } catch (err) {
    logMp("error", "[mp] refresh token failed", err);
    await markOrganizerMpOauthError(pool, row.id);
    throw new Error("Mercado Pago seller token expired — reconnect required");
  }
}

export function buildMpOauthAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
}): string {
  const redirectUri = `${appUrl()}/api/organizer/payouts/mp/oauth/callback`;
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID!,
    response_type: "code",
    platform_id: "mp",
    state: opts.state,
    redirect_uri: redirectUri,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${MP_AUTH_MX}?${params.toString()}`;
}

export async function exchangeMpOauthCode(
  pool: Pool,
  organizerId: number,
  code: string,
  codeVerifier: string,
): Promise<void> {
  const redirectUri = `${appUrl()}/api/organizer/payouts/mp/oauth/callback`;
  const token = await mpFetch<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    public_key?: string;
    user_id?: number;
    live_mode?: boolean;
  }>("/oauth/token", {
    method: "POST",
    accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
    formUrlEncoded: {
      client_id: process.env.MP_CLIENT_ID!,
      client_secret: process.env.MP_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      ...(mpOauthUsesTestToken() ? { test_token: "true" } : {}),
    },
  });

  const expires = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000)
    : null;

  await pool.query(
    `UPDATE organizers SET
       mp_user_id = ?,
       mp_access_token_enc = ?,
       mp_refresh_token_enc = ?,
       mp_token_expires_at = ?,
       mp_public_key = ?,
       mp_oauth_status = 'ready',
       mp_oauth_connected_at = NOW(),
       mp_oauth_last_synced_at = NOW(),
       mp_oauth_state_nonce = NULL,
       mp_oauth_state_expires_at = NULL,
       mp_oauth_code_verifier_enc = NULL
     WHERE id = ? AND deleted_at IS NULL`,
    [
      token.user_id != null ? String(token.user_id) : null,
      encryptSecret(token.access_token),
      token.refresh_token ? encryptSecret(token.refresh_token) : null,
      expires,
      token.public_key ?? mpPlatformPublicKey(),
      organizerId,
    ],
  );
}

export async function createMarketplacePreference(opts: {
  pool: Pool;
  organizerId: number;
  title: string;
  amountCents: number;
  marketplaceFeeCents: number;
  externalReference: string;
  payerEmail?: string;
}): Promise<{ preferenceId: string; initPoint: string | null }> {
  const row = await loadOrganizerMp(opts.pool, opts.organizerId);
  if (!row || !organizerMpReady(row)) {
    throw new Error("Mercado Pago seller not ready");
  }
  const sellerToken = await getSellerAccessToken(opts.pool, row);
  const unitPrice = Math.round(opts.amountCents) / 100;
  const fee = Math.round(opts.marketplaceFeeCents) / 100;
  const base = appUrl();

  const pref = await mpFetch<{
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  }>("/checkout/preferences", {
    method: "POST",
    accessToken: sellerToken,
    idempotencyKey: `pref_${opts.externalReference}`,
    body: {
      items: [
        {
          id: opts.externalReference.slice(0, 64),
          title: opts.title.slice(0, 256),
          quantity: 1,
          currency_id: "MXN",
          unit_price: unitPrice,
        },
      ],
      marketplace_fee: fee,
      external_reference: opts.externalReference,
      notification_url: `${base}/api/webhooks/mercadopago`,
      metadata: {
        payment_public_uuid: opts.externalReference,
        organizer_id: String(opts.organizerId),
      },
      payer: opts.payerEmail ? { email: opts.payerEmail } : undefined,
      back_urls: {
        success: `${base}/portal/registrations?mp=success`,
        failure: `${base}/portal/registrations?mp=failure`,
        pending: `${base}/portal/registrations?mp=pending`,
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [],
        installments: 1,
      },
    },
  });

  return {
    preferenceId: pref.id,
    initPoint: pref.init_point ?? pref.sandbox_init_point ?? null,
  };
}

export async function createMarketplacePayment(opts: {
  pool: Pool;
  organizerId: number;
  amountCents: number;
  applicationFeeCents: number;
  token: string;
  paymentMethodId: string;
  installments?: number;
  payerEmail: string;
  externalReference: string;
  description: string;
}): Promise<{ id: string; status: string; status_detail?: string }> {
  const row = await loadOrganizerMp(opts.pool, opts.organizerId);
  if (!row || !organizerMpReady(row)) {
    throw new Error("Mercado Pago seller not ready");
  }
  const sellerToken = await getSellerAccessToken(opts.pool, row);
  const payment = await mpFetch<{
    id: number | string;
    status: string;
    status_detail?: string;
  }>("/v1/payments", {
    method: "POST",
    accessToken: sellerToken,
    idempotencyKey: opts.externalReference,
    body: {
      transaction_amount: Math.round(opts.amountCents) / 100,
      token: opts.token,
      description: opts.description.slice(0, 255),
      installments: opts.installments ?? 1,
      payment_method_id: opts.paymentMethodId,
      payer: { email: opts.payerEmail },
      external_reference: opts.externalReference,
      application_fee: Math.round(opts.applicationFeeCents) / 100,
      metadata: {
        payment_public_uuid: opts.externalReference,
        organizer_id: String(opts.organizerId),
      },
      notification_url: `${appUrl()}/api/webhooks/mercadopago`,
    },
  });
  return {
    id: String(payment.id),
    status: payment.status,
    status_detail: payment.status_detail,
  };
}

export function mapMpRefundError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("insufficient") ||
    lower.includes("not_enough") ||
    lower.includes("not enough") ||
    lower.includes("available_money") ||
    lower.includes("collector")
  ) {
    const mapped = new Error(
      "Mercado Pago could not refund fully — seller or marketplace balance may be insufficient (Split 1:1). Retry after funds are available or refund the platform share manually.",
    ) as Error & { code?: string };
    mapped.code = "mp_refund_insufficient_funds";
    return mapped;
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function refundMercadoPagoPayment(opts: {
  pool: Pool;
  organizerId: number;
  mpPaymentId: string;
}): Promise<{ id: string }> {
  const row = await loadOrganizerMp(opts.pool, opts.organizerId);
  if (!row) throw new Error("Organizer not found");
  const sellerToken = await getSellerAccessToken(opts.pool, row);
  try {
    const refund = await mpFetch<{ id: number | string }>(
      `/v1/payments/${opts.mpPaymentId}/refunds`,
      {
        method: "POST",
        accessToken: sellerToken,
        idempotencyKey: `refund_${opts.mpPaymentId}`,
        body: {},
      },
    );
    return { id: String(refund.id) };
  } catch (err) {
    throw mapMpRefundError(err);
  }
}

export async function fetchMpPayment(
  accessToken: string,
  paymentId: string,
): Promise<{
  id: string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  collector_id?: string | number;
}> {
  const payment = await mpFetch<{
    id: number | string;
    status: string;
    status_detail?: string;
    external_reference?: string;
    metadata?: Record<string, unknown>;
    collector_id?: string | number;
  }>(`/v1/payments/${paymentId}`, { accessToken });
  return {
    id: String(payment.id),
    status: payment.status,
    status_detail: payment.status_detail,
    external_reference: payment.external_reference,
    metadata: payment.metadata,
    collector_id: payment.collector_id,
  };
}

export function mapMpPaymentStatusToPlatform(
  status: string,
): "succeeded" | "processing" | "failed" | "ignored" {
  switch (status) {
    case "approved":
      return "succeeded";
    case "pending":
    case "in_process":
    case "authorized":
      return "processing";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "failed";
    default:
      return "ignored";
  }
}

export function buildMpChecklist(row: OrganizerMpRow | null): {
  items: Array<{ key: string; complete: boolean; required: boolean }>;
  complete: boolean;
} {
  const connected = Boolean(
    row && isMercadoPagoReady(row.mp_oauth_status) && row.mp_user_id,
  );
  const items = [
    { key: "mp_oauth", complete: connected, required: true },
    {
      key: "mp_configured",
      complete: isMercadoPagoConfigured(),
      required: true,
    },
  ];
  return { items, complete: items.every((i) => i.complete) };
}

function canManagePayouts(role: string | undefined): boolean {
  return Boolean(role && ["owner", "finance", "organizer"].includes(role));
}

/**
 * Claim a webhook delivery for processing.
 * Inserts with processed_at NULL so failed handlers can be retried on redelivery.
 * Returns: "new" | "retry" (duplicate but unfinished) | "done" (already processed).
 */
export async function claimMpWebhookEvent(
  pool: Pool,
  mpEventId: string,
  topic: string | null,
  action: string | null,
  payload: unknown,
): Promise<"new" | "retry" | "done"> {
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO mercadopago_webhook_events (mp_event_id, topic, action, payload_json, processed_at)
       VALUES (?,?,?,?,NULL)`,
      [mpEventId, topic, action, JSON.stringify(payload ?? null)],
    );
    return "new";
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== "ER_DUP_ENTRY") throw err;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT processed_at FROM mercadopago_webhook_events WHERE mp_event_id = ? LIMIT 1`,
      [mpEventId],
    );
    if (rows[0]?.processed_at) return "done";
    return "retry";
  }
}

/** Mark a claimed webhook event as successfully processed. */
export async function markMpWebhookProcessed(
  pool: Pool,
  mpEventId: string,
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE mercadopago_webhook_events SET processed_at = NOW() WHERE mp_event_id = ?`,
    [mpEventId],
  );
}

/** @deprecated Prefer claimMpWebhookEvent — kept for tests that expect boolean. */
export async function recordMpWebhookEvent(
  pool: Pool,
  mpEventId: string,
  topic: string | null,
  action: string | null,
  payload: unknown,
): Promise<boolean> {
  const claim = await claimMpWebhookEvent(
    pool,
    mpEventId,
    topic,
    action,
    payload,
  );
  if (claim === "done") return false;
  if (claim === "new") {
    await markMpWebhookProcessed(pool, mpEventId);
  }
  return claim === "new" || claim === "retry";
}

async function findOrganizerByMpUserId(
  _pool: Pool,
  _mpUserId: string,
): Promise<OrganizerMpRow | null> {
  // mp_user_id column removed — cannot resolve sellers by MP user id.
  return null;
}

export async function revokeOrganizerMpLink(
  _pool: Pool,
  organizerId: number,
): Promise<void> {
  logMp("warn", `[mp] revoke skipped for organizer ${organizerId} (mp columns removed)`);
}

/** Handle OAuth link/unlink webhook topics (`mp-connect`). */
export async function handleMpConnectWebhook(
  pool: Pool,
  body: Record<string, unknown>,
): Promise<{ handled: boolean }> {
  const action = String(body.action || "").toLowerCase();
  const userId = String(
    body.user_id ??
      (body.data as { user_id?: unknown } | undefined)?.user_id ??
      "",
  );
  if (!userId) return { handled: false };

  const isUnlink =
    action.includes("deauthor") ||
    action.includes("disconnect") ||
    action.includes("unlink") ||
    action === "application.deauthorized";

  if (!isUnlink) return { handled: false };

  const org = await findOrganizerByMpUserId(pool, userId);
  if (!org) return { handled: true };
  await revokeOrganizerMpLink(pool, org.id);
  logMp("warn", `[mp] oauth revoked via webhook for organizer ${org.id}`);
  return { handled: true };
}

async function resolveMpPaymentFromWebhook(
  pool: Pool,
  dataId: string,
  body: Record<string, unknown>,
): Promise<{
  mpPayment: Awaited<ReturnType<typeof fetchMpPayment>>;
  paymentRow: RowDataPacket | null;
}> {
  const collectorHint = String(
    body.user_id ??
      (body.data as { user_id?: unknown } | undefined)?.user_id ??
      "",
  );

  let sellerRow: OrganizerMpRow | null = null;
  if (collectorHint) {
    sellerRow = await findOrganizerByMpUserId(pool, collectorHint);
  }

  let mpPayment: Awaited<ReturnType<typeof fetchMpPayment>> | null = null;

  if (sellerRow && organizerMpReady(sellerRow)) {
    try {
      const token = await getSellerAccessToken(pool, sellerRow);
      mpPayment = await fetchMpPayment(token, dataId);
    } catch (err) {
      logMp("warn", "[mp] webhook seller fetch failed", err);
    }
  }

  if (!mpPayment) {
    const platformToken = process.env.MP_PLATFORM_ACCESS_TOKEN;
    if (platformToken) {
      try {
        mpPayment = await fetchMpPayment(platformToken, dataId);
        const metaOrg = mpPayment.metadata?.organizer_id;
        const collector =
          mpPayment.collector_id != null
            ? String(mpPayment.collector_id)
            : null;
        if (!sellerRow && (metaOrg || collector)) {
          sellerRow = metaOrg
            ? await loadOrganizerMp(pool, Number(metaOrg))
            : collector
              ? await findOrganizerByMpUserId(pool, collector)
              : null;
          if (sellerRow && organizerMpReady(sellerRow)) {
            try {
              const token = await getSellerAccessToken(pool, sellerRow);
              mpPayment = await fetchMpPayment(token, dataId);
            } catch {
              /* keep platform payload */
            }
          }
        }
      } catch (err) {
        logMp("warn", "[mp] webhook platform fetch failed", err);
      }
    }
  }

  if (!mpPayment) {
    throw new Error("Could not fetch Mercado Pago payment");
  }

  const [[byMpId]] = await pool.query<RowDataPacket[]>(
    `SELECT id, public_uuid, athlete_id, organizer_id, amount_cents, status, registration_id,
            mercadopago_payment_id
     FROM payments
     WHERE mercadopago_payment_id = ? OR public_uuid = ?
     LIMIT 1`,
    [dataId, mpPayment.external_reference || dataId],
  );

  let paymentRow = byMpId ?? null;
  if (!paymentRow && mpPayment.external_reference) {
    const [[byExt]] = await pool.query<RowDataPacket[]>(
      `SELECT id, public_uuid, athlete_id, organizer_id, amount_cents, status, registration_id,
              mercadopago_payment_id
       FROM payments WHERE public_uuid = ? LIMIT 1`,
      [mpPayment.external_reference],
    );
    paymentRow = byExt ?? null;
  }

  return { mpPayment, paymentRow };
}

export type MpPaymentWebhookConfirm = {
  paymentPublicUuid: string;
  athleteId: number;
};

export type MpPaymentWebhookReverse = {
  paymentId: number;
  reason: string;
  mpStatus: string;
};

/**
 * Apply payment webhook status to Atleita payments.
 * Returns confirm payload when registration should be finalized,
 * or reverse payload when an already-succeeded payment is refunded/charged back externally.
 */
export async function applyMpPaymentWebhookStatus(
  pool: Pool,
  dataId: string,
  body: Record<string, unknown>,
): Promise<{
  confirm?: MpPaymentWebhookConfirm;
  reverse?: MpPaymentWebhookReverse;
  updated: boolean;
}> {
  const { mpPayment, paymentRow } = await resolveMpPaymentFromWebhook(
    pool,
    dataId,
    body,
  );
  if (!paymentRow) {
    return { updated: false };
  }

  const mapped = mapMpPaymentStatusToPlatform(mpPayment.status);
  if (mapped === "ignored") return { updated: false };

  if (mapped === "succeeded") {
    await pool.query(
      `UPDATE payments SET mercadopago_payment_id = ?, status = 'succeeded',
         failure_code = NULL, failure_message = NULL
       WHERE id = ? AND status NOT IN ('refunded','partially_refunded')`,
      [mpPayment.id, paymentRow.id],
    );
    if (
      paymentRow.status !== "succeeded" &&
      paymentRow.status !== "refunded" &&
      !paymentRow.registration_id
    ) {
      // Solo: no registration yet. Group: registration_id stays null even after confirm —
      // always attempt confirm; finalize is idempotent for both paths.
      return {
        updated: true,
        confirm: {
          paymentPublicUuid: String(paymentRow.public_uuid),
          athleteId: Number(paymentRow.athlete_id),
        },
      };
    }
    // Already succeeded — still confirm if group/solo not finalized yet
    if (paymentRow.status === "succeeded" || paymentRow.status === "processing") {
      return {
        updated: true,
        confirm: {
          paymentPublicUuid: String(paymentRow.public_uuid),
          athleteId: Number(paymentRow.athlete_id),
        },
      };
    }
    return { updated: true };
  }

  if (mapped === "processing") {
    await pool.query(
      `UPDATE payments SET mercadopago_payment_id = ?, status = 'processing'
       WHERE id = ? AND status IN ('pending','processing')`,
      [mpPayment.id, paymentRow.id],
    );
    return { updated: true };
  }

  // failed / cancelled / rejected / refunded / charged_back
  const reason = (mpPayment.status_detail || mpPayment.status).slice(0, 500);
  const isExternalReversal =
    mpPayment.status === "refunded" || mpPayment.status === "charged_back";

  let hasConfirmedRegs = Boolean(paymentRow.registration_id);
  if (!hasConfirmedRegs && paymentRow.status === "succeeded") {
    const [[ord]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM registrations r
       JOIN registration_orders o ON o.id = r.order_id
       WHERE o.payment_id = ? AND r.status = 'confirmed' AND r.deleted_at IS NULL`,
      [paymentRow.id],
    );
    hasConfirmedRegs = Number(ord?.c || 0) > 0;
  }

  if (
    (paymentRow.status === "succeeded" || hasConfirmedRegs) &&
    (isExternalReversal || mapped === "failed")
  ) {
    await pool.query(
      `UPDATE payments SET mercadopago_payment_id = COALESCE(?, mercadopago_payment_id)
       WHERE id = ?`,
      [mpPayment.id, paymentRow.id],
    );
    return {
      updated: true,
      reverse: {
        paymentId: Number(paymentRow.id),
        reason,
        mpStatus: mpPayment.status,
      },
    };
  }

  await pool.query(
    `UPDATE payments SET mercadopago_payment_id = ?, status = 'failed',
       failure_code = ?, failure_message = ?
     WHERE id = ? AND status IN ('pending','processing')`,
    [mpPayment.id, mpPayment.status.slice(0, 64), reason, paymentRow.id],
  );
  return { updated: true };
}

/** Renew seller OAuth tokens — no-op after organizer mp_* columns were dropped. */
export async function renewExpiringMpSellerTokens(
  _pool: Pool,
  _withinDays = 14,
): Promise<{ renewed: number; failed: number }> {
  return { renewed: 0, failed: 0 };
}

export async function expireStaleMpPendingPayments(
  pool: Pool,
): Promise<{ expired: number }> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE payments SET
       status = 'failed',
       failure_code = 'mp_pending_expired',
       failure_message = 'Mercado Pago voucher / pending payment expired'
     WHERE provider = 'mercadopago'
       AND status IN ('pending', 'processing')
       AND registration_id IS NULL
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [MP_PENDING_PAYMENT_TTL_DAYS],
  );
  return { expired: result.affectedRows || 0 };
}

/**
 * Keeps payout rail setter (stripe|manual). Organizer MP OAuth routes return 410.
 */
export function registerMercadoPagoRoutes(
  app: Express,
  pool: Pool,
  requireOrganizer: (req: Request, res: Response, next: () => void) => void,
  buildStatusResponse: (organizerId: number) => Promise<unknown>,
  getOrganizerMemberRole: (
    pool: Pool,
    memberId: number,
    organizerId: number,
  ) => Promise<string | null>,
): void {
  async function assertOrganizerCanManagePayouts(
    req: AuthedRequest,
    res: Response,
  ): Promise<boolean> {
    const organizerId = req.auth?.organizerId;
    const memberId = req.auth?.id;
    if (!organizerId || !memberId) {
      res.status(403).json({ error: "Organizer context missing" });
      return false;
    }
    const memberRole = await getOrganizerMemberRole(
      pool,
      memberId,
      organizerId,
    );
    if (!canManagePayouts(memberRole ?? undefined)) {
      res.status(403).json({ error: "Insufficient permissions for payouts" });
      return false;
    }
    return true;
  }

  const gone = (_req: Request, res: Response) =>
    res.status(410).json({
      error: "Mercado Pago is no longer available",
      code: "mp_removed",
    });

  app.get("/api/organizer/payouts/mp/oauth/start", requireOrganizer, gone);
  app.get("/api/organizer/payouts/mp/oauth/callback", (_req, res) => {
    res.redirect(`${appUrl()}/staff/payments?tab=setup`);
  });
  app.post("/api/organizer/payouts/mp/disconnect", requireOrganizer, gone);

  app.post(
    "/api/organizer/payouts/rail",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      if (!(await assertOrganizerCanManagePayouts(req, res))) return;
      const rail = req.body?.payout_rail ?? req.body?.payoutRail;
      if (!isPayoutRail(rail)) {
        return res.status(400).json({
          error: "payout_rail must be stripe or manual",
        });
      }
      await pool.query(`UPDATE organizers SET payout_rail = ? WHERE id = ?`, [
        rail,
        req.auth!.organizerId!,
      ]);
      const status = await buildStatusResponse(req.auth!.organizerId!);
      return res.json(status);
    },
  );

  app.post("/api/cron/cleanup-mp-pending", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const provided =
      String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
      String(req.query.secret || "");
    if (!cronSecret || provided !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const expired = await expireStaleMpPendingPayments(pool);
      return res.json({ ok: true, ...expired, renewed: 0, failed: 0 });
    } catch (err) {
      logMp("error", "[mp] cleanup pending", err);
      return res.status(500).json({ error: "cleanup failed" });
    }
  });
}
