import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import {
  DEFAULT_SITE_PUBLIC_PROFILE,
  mergeSitePublicProfile,
  type SitePublicProfile,
} from "../shared/siteLegal.js";

export const SITE_PUBLIC_PROFILE_KEY = "site_public_profile";
export const RESEND_EVENT_UPDATES_TOPIC_KEY = "resend_event_updates_topic";

export type ResendEventUpdatesTopicSetting = {
  topicId: string | null;
};

const EMPTY_RESEND_TOPIC_SETTING: ResendEventUpdatesTopicSetting = {
  topicId: null,
};

async function fetchPlatformSettingValue(
  pool: Pool,
  settingKey: string,
): Promise<unknown | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1`,
    [settingKey],
  );
  if (rows.length === 0) return null;
  const raw = rows[0].setting_value;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

async function savePlatformSettingValue(
  pool: Pool,
  settingKey: string,
  value: unknown,
): Promise<void> {
  const payload =
    typeof value === "string" ? value : JSON.stringify(value ?? null);
  await pool.query<ResultSetHeader>(
    `INSERT INTO platform_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [settingKey, payload],
  );
}

export async function fetchResendEventUpdatesTopicId(
  pool: Pool,
): Promise<string | null> {
  try {
    const raw = await fetchPlatformSettingValue(
      pool,
      RESEND_EVENT_UPDATES_TOPIC_KEY,
    );
    if (!raw || typeof raw !== "object") return null;
    const topicId = (raw as ResendEventUpdatesTopicSetting).topicId;
    if (topicId == null) return null;
    const trimmed = String(topicId).trim();
    return trimmed || null;
  } catch (err) {
    if (isMissingPlatformSettingsTable(err)) {
      console.warn(
        "[platformSettings] platform_settings table missing — Resend topic unset. Apply migrations.",
      );
      return null;
    }
    throw err;
  }
}

export async function fetchResendEventUpdatesTopicSetting(
  pool: Pool,
): Promise<ResendEventUpdatesTopicSetting> {
  const topicId = await fetchResendEventUpdatesTopicId(pool);
  return { topicId };
}

export function normalizeResendEventUpdatesTopicSetting(
  body: unknown,
): ResendEventUpdatesTopicSetting | null {
  if (!body || typeof body !== "object") return null;
  const topicIdRaw = (body as { topicId?: unknown }).topicId;
  if (topicIdRaw === null || topicIdRaw === undefined || topicIdRaw === "") {
    return { ...EMPTY_RESEND_TOPIC_SETTING };
  }
  if (typeof topicIdRaw !== "string") return null;
  const trimmed = topicIdRaw.trim();
  if (!trimmed) return { ...EMPTY_RESEND_TOPIC_SETTING };
  if (trimmed.length > 64) return null;
  return { topicId: trimmed };
}

export async function saveResendEventUpdatesTopicSetting(
  pool: Pool,
  setting: ResendEventUpdatesTopicSetting,
): Promise<void> {
  try {
    await savePlatformSettingValue(pool, RESEND_EVENT_UPDATES_TOPIC_KEY, {
      topicId: setting.topicId,
    });
  } catch (err) {
    if (isMissingPlatformSettingsTable(err)) {
      throw new Error(
        "platform_settings table missing. Apply migration 20260615_120000_platform_settings.sql",
      );
    }
    throw err;
  }
}

function isMissingPlatformSettingsTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message ?? "");
  return (
    code === "ER_NO_SUCH_TABLE" ||
    /platform_settings.*doesn't exist/i.test(message)
  );
}

export async function fetchSitePublicProfile(pool: Pool): Promise<SitePublicProfile> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1`,
      [SITE_PUBLIC_PROFILE_KEY],
    );
    if (rows.length === 0) {
      return { ...DEFAULT_SITE_PUBLIC_PROFILE };
    }
    const raw = rows[0].setting_value;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return mergeSitePublicProfile(parsed as Partial<SitePublicProfile>);
    } catch {
      return { ...DEFAULT_SITE_PUBLIC_PROFILE };
    }
  } catch (err) {
    if (isMissingPlatformSettingsTable(err)) {
      console.warn(
        "[platformSettings] platform_settings table missing — returning defaults. Apply migration 20260615_120000_platform_settings.sql",
      );
      return { ...DEFAULT_SITE_PUBLIC_PROFILE };
    }
    throw err;
  }
}

export async function saveSitePublicProfile(
  pool: Pool,
  profile: SitePublicProfile,
): Promise<void> {
  const payload = JSON.stringify(profile);
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO platform_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [SITE_PUBLIC_PROFILE_KEY, payload],
    );
  } catch (err) {
    if (isMissingPlatformSettingsTable(err)) {
      throw new Error(
        "platform_settings table missing. Apply migration 20260615_120000_platform_settings.sql",
      );
    }
    throw err;
  }
}

export function normalizeSitePublicProfile(body: unknown): SitePublicProfile | null {
  if (!body || typeof body !== "object") return null;
  return mergeSitePublicProfile(body as Partial<SitePublicProfile>);
}
