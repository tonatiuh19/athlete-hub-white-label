import axios, { type AxiosRequestHeaders } from "axios";
import {
  getStoredLocale,
  detectBrowserLocale,
  normalizeLocale,
  LOCALE_HTML_LANG,
} from "@shared/i18n";

const api = axios.create({
  baseURL: "/api",
  // Prevent infinite staff/athlete hydrate spinners when the API hangs.
  timeout: 25_000,
});

const ATHLETE_TOKEN_KEY = "atleita_athlete_token";
const STAFF_TOKEN_KEY = "atleita_staff_token";
const STAFF_ROLE_KEY = "atleita_staff_role";

/** Clear persisted staff auth (token + role). */
export function clearStaffSession() {
  setStaffToken(null);
  localStorage.removeItem(STAFF_ROLE_KEY);
}

/**
 * Only wipe staff session on auth failures — not on wrong-realm 401s
 * (e.g. admin JWT hitting /organizer/*), which previously logged admins out.
 */
export function shouldClearStaffSessionOn401(
  url: string,
  errorMessage: unknown,
  errorCode?: unknown,
): boolean {
  const msg = typeof errorMessage === "string" ? errorMessage : "";
  const code = typeof errorCode === "string" ? errorCode : "";
  const isHydrate =
    url.includes("/auth/admin/me") || url.includes("/auth/organizer/me");
  const sessionExpired =
    code === "session_expired" ||
    /^session expired$/i.test(msg) ||
    /^sesión expirada$/i.test(msg);
  return isHydrate || sessionExpired;
}

export function getAthleteToken() {
  return localStorage.getItem(ATHLETE_TOKEN_KEY);
}
export function setAthleteToken(t: string | null) {
  if (t) localStorage.setItem(ATHLETE_TOKEN_KEY, t);
  else localStorage.removeItem(ATHLETE_TOKEN_KEY);
}

export function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY);
}
export function setStaffToken(t: string | null) {
  if (t) localStorage.setItem(STAFF_TOKEN_KEY, t);
  else localStorage.removeItem(STAFF_TOKEN_KEY);
}

/** Force axios to attach the athlete JWT (never staff) for portal / checkout calls */
export const athleteAuthHeaders = { "X-Auth-Realm": "athlete" } as const;

/** Force axios to attach the staff JWT for console / admin / organizer calls */
export const staffAuthHeaders = { "X-Auth-Realm": "staff" } as const;

function isStaffRoute(url: string) {
  return (
    url.startsWith("/admin") ||
    url.startsWith("/organizer") ||
    url.startsWith("/auth/admin") ||
    url.startsWith("/auth/organizer") ||
    url.startsWith("/auth/staff")
  );
}

api.interceptors.request.use((config) => {
  const url = config.url || "";
  const realm = config.headers?.["X-Auth-Realm"];
  let token: string | null;
  if (realm === "staff") {
    token = getStaffToken();
  } else if (realm === "athlete") {
    token = getAthleteToken();
  } else {
    token = isStaffRoute(url) ? getStaffToken() : getAthleteToken();
  }
  if (token) {
    if (!config.headers) config.headers = {} as AxiosRequestHeaders;
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locale =
    getStoredLocale() ??
    (typeof navigator !== "undefined" ? detectBrowserLocale() : normalizeLocale(undefined));
  if (!config.headers) config.headers = {} as AxiosRequestHeaders;
  config.headers["Accept-Language"] = LOCALE_HTML_LANG[locale];
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url: string = err?.config?.url || "";
      const realm = err?.config?.headers?.["X-Auth-Realm"];
      const staffContext = realm === "staff" || (!realm && isStaffRoute(url));
      if (staffContext) {
        const errorMessage = err?.response?.data?.error;
        const errorCode = err?.response?.data?.code;
        if (shouldClearStaffSessionOn401(url, errorMessage, errorCode)) {
          clearStaffSession();
          if (!window.location.pathname.startsWith("/staff/login")) {
            window.location.href = "/staff/login";
          }
        }
      } else {
        setAthleteToken(null);
        const path = window.location.pathname;
        const onPublicAuthFlow =
          path.startsWith("/events") ||
          path.startsWith("/login") ||
          path.startsWith("/sso-callback");
        if (!onPublicAuthFlow) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;

export const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.CLERK_PUBLISHABLE_KEY ||
  "";
/** Atleita is passwordless email OTP only — Clerk social is not offered. */
export const isClerkEnabled = false;
