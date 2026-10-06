import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import api, {
  clearStaffSession,
  getStaffToken,
  setStaffToken,
  staffAuthHeaders,
} from "@/lib/api";
import { explicitRequestLocale, normalizeLocale } from "@shared/i18n";
import { normalizeTheme } from "@shared/theme";
import type { StaffProfileUpdateRequest, StaffRole, StaffUser } from "@shared/api";
import i18n from "@/i18n";
import { extractApiErrorMessage } from "@/utils/apiError";
import {
  decodeStaffRoleFromToken,
  isStaffHydrateAuthFailure,
} from "@/utils/staffSession";

const STAFF_ROLE_KEY = "atleita_staff_role";

function authLocaleBody(): { locale?: string } {
  const locale = explicitRequestLocale();
  return locale ? { locale } : {};
}

function getStoredStaffRole(): StaffRole | null {
  const r = localStorage.getItem(STAFF_ROLE_KEY);
  return r === "admin" || r === "organizer" ? r : null;
}

function setStoredStaffRole(r: StaffRole | null) {
  if (r) localStorage.setItem(STAFF_ROLE_KEY, r);
  else localStorage.removeItem(STAFF_ROLE_KEY);
}

/** Prefer stored role; fall back to JWT actor so a missing role key never forces logout. */
function resolveInitialStaffRole(token: string | null): StaffRole | null {
  const stored = getStoredStaffRole();
  if (stored) return stored;
  const fromToken = decodeStaffRoleFromToken(token);
  if (fromToken) setStoredStaffRole(fromToken);
  return fromToken;
}

function mapStaffUser(role: StaffRole, data: Record<string, unknown>): StaffUser {
  const source = role === "admin" ? (data.admin as Record<string, unknown>) : (data.member as Record<string, unknown>);
  if (!source || typeof source !== "object") {
    throw new Error("Invalid staff profile response");
  }
  const base = {
    id: source.id as number,
    email: source.email as string,
    firstName: (source.firstName ?? source.first_name) as string,
    lastName: (source.lastName ?? source.last_name) as string,
    role: source.role as string,
    phone: (source.phone as string | null | undefined) ?? null,
    avatarUrl: (source.avatarUrl ?? source.avatar_url ?? null) as string | null,
    preferredLanguage: (source.preferredLanguage ?? source.preferred_language) as string | undefined,
    preferredTheme: (source.preferredTheme ?? source.preferred_theme) as string | undefined,
    lastLoginAt: (source.lastLoginAt ?? source.last_login_at ?? null) as string | null,
    createdAt: (source.createdAt ?? source.created_at) as string | undefined,
  };
  if (role === "admin") {
    return { type: "admin", ...base };
  }
  return {
    type: "organizer",
    ...base,
    organizerId: (source.organizerId ?? source.organizer_id) as number,
    organizerName: (source.organizerName ?? source.organizer_name) as string | undefined,
    eventAccessScope: (source.eventAccessScope ??
      source.event_access_scope ??
      "organization") as "organization" | "events",
    assignedEventIds: Array.isArray(source.assignedEventIds)
      ? (source.assignedEventIds as number[])
      : Array.isArray(source.assigned_event_ids)
        ? (source.assigned_event_ids as number[])
        : [],
  };
}

interface StaffAuthState {
  user: StaffUser | null;
  role: StaffRole | null;
  token: string | null;
  loading: boolean;
  requestingOtp: boolean;
  verifyingOtp: boolean;
  updatingProfile: boolean;
  uploadingAvatar: boolean;
  error: string | null;
  profileError: string | null;
  /** Transient /me failure — token kept so staff are not forced to re-OTP. */
  hydrateError: string | null;
  otpSentTo: string | null;
}

const initialStoredToken = getStaffToken();
const initialStoredRole = resolveInitialStaffRole(initialStoredToken);

const initialState: StaffAuthState = {
  user: null,
  role: initialStoredRole,
  token: initialStoredToken,
  // Only block on /me when we can actually hydrate (token + role).
  loading: Boolean(initialStoredToken && initialStoredRole),
  requestingOtp: false,
  verifyingOtp: false,
  updatingProfile: false,
  uploadingAvatar: false,
  error: null,
  profileError: null,
  hydrateError: null,
  otpSentTo: null,
};

const staffRequest = { headers: staffAuthHeaders };

export const requestStaffOtp = createAsyncThunk<
  { email: string; role: StaffRole },
  { email: string },
  { rejectValue: string }
>("staffAuth/requestOtp", async ({ email }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/staff/request-otp", {
      email,
      ...authLocaleBody(),
    });
    return { email, role: data.role as StaffRole };
  } catch (e: unknown) {
    return rejectWithValue(extractApiErrorMessage(e, "Could not send verification code."));
  }
});

/** Role-scoped OTP (separate organizer vs admin login pages). */
export const requestRoleOtp = createAsyncThunk<
  { email: string; role: StaffRole },
  { email: string; role: StaffRole },
  { rejectValue: string }
>("staffAuth/requestRoleOtp", async ({ email, role }, { rejectWithValue }) => {
  try {
    const path =
      role === "admin" ? "/auth/admin/request-otp" : "/auth/organizer/request-otp";
    await api.post(path, { email, ...authLocaleBody() });
    return { email, role };
  } catch (e: unknown) {
    return rejectWithValue(extractApiErrorMessage(e, "Could not send verification code."));
  }
});

function staffUserFromVerifyPayload(
  role: StaffRole,
  data: Record<string, any>,
): StaffUser {
  if (role === "admin") {
    return {
      type: "admin",
      id: data.admin.id,
      email: data.admin.email,
      firstName: data.admin.firstName,
      lastName: data.admin.lastName,
      role: data.admin.role,
      preferredLanguage: data.admin.preferredLanguage,
      preferredTheme: data.admin.preferredTheme,
    };
  }
  return {
    type: "organizer",
    id: data.member.id,
    email: data.member.email,
    firstName: data.member.firstName,
    lastName: data.member.lastName,
    role: data.member.role,
    organizerId: data.member.organizerId,
    preferredLanguage: data.member.preferredLanguage,
    preferredTheme: data.member.preferredTheme,
  };
}

export const verifyStaffOtp = createAsyncThunk<
  { token: string; user: StaffUser; role: StaffRole },
  { email: string; code: string },
  { rejectValue: string }
>("staffAuth/verifyOtp", async ({ email, code }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/staff/verify-otp", { email, code });
    setStaffToken(data.token);
    const role = data.role as StaffRole;
    return {
      token: data.token,
      user: staffUserFromVerifyPayload(role, data),
      role,
    };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Invalid code");
  }
});

export const verifyRoleOtp = createAsyncThunk<
  { token: string; user: StaffUser; role: StaffRole },
  { email: string; code: string; role: StaffRole },
  { rejectValue: string }
>("staffAuth/verifyRoleOtp", async ({ email, code, role }, { rejectWithValue }) => {
  try {
    const path =
      role === "admin" ? "/auth/admin/verify-otp" : "/auth/organizer/verify-otp";
    const { data } = await api.post(path, { email, code });
    setStaffToken(data.token);
    return {
      token: data.token,
      user: staffUserFromVerifyPayload(role, data),
      role,
    };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Invalid code");
  }
});
export const fetchStaffMe = createAsyncThunk<
  { user: StaffUser; role: StaffRole },
  StaffRole,
  {
    rejectValue: {
      message: string;
      status?: number;
      authFailure: boolean;
    };
  }
>("staffAuth/me", async (role, { rejectWithValue }) => {
  try {
    const path = role === "admin" ? "/auth/admin/me" : "/auth/organizer/me";
    const { data } = await api.get(path, staffRequest);
    return { user: mapStaffUser(role, data as Record<string, unknown>), role };
  } catch (e: unknown) {
    const err = e as {
      response?: { status?: number; data?: { error?: string } };
      message?: string;
    };
    const status = err?.response?.status;
    return rejectWithValue({
      message: err?.response?.data?.error || err?.message || "Unauthorized",
      status,
      authFailure: isStaffHydrateAuthFailure(status),
    });
  }
});

export const updateStaffProfile = createAsyncThunk<
  StaffUser,
  StaffProfileUpdateRequest & { role: StaffRole },
  { rejectValue: string }
>("staffAuth/updateProfile", async ({ role, ...body }, { rejectWithValue }) => {
  try {
    const path = role === "admin" ? "/auth/admin/me" : "/auth/organizer/me";
    const { data } = await api.patch(path, body, staffRequest);
    return mapStaffUser(role, data as Record<string, unknown>);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Could not update profile");
  }
});

export const updateStaffLanguage = createAsyncThunk<
  { preferred_language: string; role: StaffRole },
  { locale: string; role: StaffRole },
  { rejectValue: string }
>("staffAuth/updateLanguage", async ({ locale, role }, { rejectWithValue }) => {
  try {
    const normalized = normalizeLocale(locale);
    const path = role === "admin" ? "/auth/admin/me" : "/auth/organizer/me";
    await api.patch(path, { preferred_language: normalized }, staffRequest);
    return { preferred_language: normalized, role };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Error");
  }
});

export const updateStaffTheme = createAsyncThunk<
  { preferred_theme: string; role: StaffRole },
  { theme: string; role: StaffRole },
  { rejectValue: string }
>("staffAuth/updateTheme", async ({ theme, role }, { rejectWithValue }) => {
  try {
    const normalized = normalizeTheme(theme);
    const path = role === "admin" ? "/auth/admin/me" : "/auth/organizer/me";
    await api.patch(path, { preferred_theme: normalized }, staffRequest);
    return { preferred_theme: normalized, role };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Error");
  }
});

export const uploadStaffAvatar = createAsyncThunk<
  string,
  { image: string; role: StaffRole },
  { rejectValue: string }
>("staffAuth/uploadAvatar", async ({ image, role }, { rejectWithValue }) => {
  try {
    const path = role === "admin" ? "/auth/admin/avatar" : "/auth/organizer/avatar";
    const { data } = await api.post(path, { image }, staffRequest);
    return (data.avatarUrl ?? data.avatar_url) as string;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Could not upload photo");
  }
});

export const removeStaffAvatar = createAsyncThunk<
  null,
  StaffRole,
  { rejectValue: string }
>("staffAuth/removeAvatar", async (role, { rejectWithValue }) => {
  try {
    const path = role === "admin" ? "/auth/admin/avatar" : "/auth/organizer/avatar";
    await api.delete(path, staffRequest);
    return null;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(err?.response?.data?.error || "Could not remove photo");
  }
});

export const staffLogout = createAsyncThunk("staffAuth/logout", async () => {
  try {
    await api.post("/auth/logout", {}, { headers: staffAuthHeaders });
  } catch {
    /* ignore */
  }
  clearStaffSession();
});

const slice = createSlice({
  name: "staffAuth",
  initialState,
  reducers: {
    clearStaffError(state) {
      state.error = null;
      state.profileError = null;
      state.hydrateError = null;
    },
    /** Recover role from JWT when localStorage role key was lost. */
    restoreStaffRoleFromToken(state) {
      if (state.role || !state.token) return;
      const recovered = decodeStaffRoleFromToken(state.token);
      if (recovered) {
        state.role = recovered;
        setStoredStaffRole(recovered);
      }
    },
    setStaffPreferredTheme(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.preferredTheme = normalizeTheme(action.payload);
      }
    },
  },
  extraReducers: (b) => {
    const otpPending = (s: StaffAuthState) => {
      s.requestingOtp = true;
      s.error = null;
    };
    const otpFulfilled = (
      s: StaffAuthState,
      a: PayloadAction<{ email: string; role: StaffRole }>,
    ) => {
      s.requestingOtp = false;
      s.otpSentTo = a.payload.email;
      s.role = a.payload.role;
      s.hydrateError = null;
      setStoredStaffRole(a.payload.role);
    };
    const otpRejected = (s: StaffAuthState, a: PayloadAction<string | undefined>) => {
      s.requestingOtp = false;
      s.error = a.payload || "Error";
    };
    b.addCase(requestStaffOtp.pending, otpPending);
    b.addCase(requestStaffOtp.fulfilled, otpFulfilled);
    b.addCase(requestStaffOtp.rejected, otpRejected);
    b.addCase(requestRoleOtp.pending, otpPending);
    b.addCase(requestRoleOtp.fulfilled, otpFulfilled);
    b.addCase(requestRoleOtp.rejected, otpRejected);

    const verifyPending = (s: StaffAuthState) => {
      s.verifyingOtp = true;
      s.error = null;
    };
    const verifyFulfilled = (
      s: StaffAuthState,
      a: PayloadAction<{ token: string; user: StaffUser; role: StaffRole }>,
    ) => {
      s.verifyingOtp = false;
      s.loading = false;
      s.token = a.payload.token;
      s.user = a.payload.user;
      s.role = a.payload.role;
      s.hydrateError = null;
      setStoredStaffRole(a.payload.role);
    };
    const verifyRejected = (s: StaffAuthState, a: PayloadAction<string | undefined>) => {
      s.verifyingOtp = false;
      s.error = a.payload || "Error";
    };
    b.addCase(verifyStaffOtp.pending, verifyPending);
    b.addCase(verifyStaffOtp.fulfilled, verifyFulfilled);
    b.addCase(verifyStaffOtp.rejected, verifyRejected);
    b.addCase(verifyRoleOtp.pending, verifyPending);
    b.addCase(verifyRoleOtp.fulfilled, verifyFulfilled);
    b.addCase(verifyRoleOtp.rejected, verifyRejected);
    b.addCase(fetchStaffMe.pending, (s) => {
      // Keep the shell usable if we already hydrated from OTP / prior /me.
      if (!s.user) s.loading = true;
      s.hydrateError = null;
    });
    b.addCase(fetchStaffMe.fulfilled, (s, a) => {
      s.loading = false;
      s.hydrateError = null;
      s.user = a.payload.user;
      s.role = a.payload.role;
      if (a.payload.user.preferredLanguage) {
        void i18n.changeLanguage(normalizeLocale(a.payload.user.preferredLanguage));
      }
    });
    b.addCase(fetchStaffMe.rejected, (s, a) => {
      s.loading = false;
      // Keep an already-authenticated user (e.g. just verified OTP) on transient /me failures.
      if (s.user) return;
      // Auth failure → wipe session. Network/5xx → keep token so tab close ≠ logout.
      if (a.payload?.authFailure) {
        clearStaffSession();
        s.token = null;
        s.user = null;
        s.role = null;
        s.hydrateError = null;
        return;
      }
      s.hydrateError =
        a.payload?.message || "Could not restore session. Please retry.";
    });

    b.addCase(updateStaffProfile.pending, (s) => {
      s.updatingProfile = true;
      s.profileError = null;
    });
    b.addCase(updateStaffProfile.fulfilled, (s, a) => {
      s.updatingProfile = false;
      s.user = a.payload;
      if (a.payload.preferredLanguage) {
        void i18n.changeLanguage(normalizeLocale(a.payload.preferredLanguage));
      }
    });
    b.addCase(updateStaffProfile.rejected, (s, a) => {
      s.updatingProfile = false;
      s.profileError = a.payload || "Error";
    });

    b.addCase(uploadStaffAvatar.pending, (s) => {
      s.uploadingAvatar = true;
      s.profileError = null;
    });
    b.addCase(uploadStaffAvatar.fulfilled, (s, a) => {
      s.uploadingAvatar = false;
      if (s.user) s.user.avatarUrl = a.payload;
    });
    b.addCase(uploadStaffAvatar.rejected, (s, a) => {
      s.uploadingAvatar = false;
      s.profileError = a.payload || "Error";
    });

    b.addCase(removeStaffAvatar.fulfilled, (s) => {
      s.uploadingAvatar = false;
      if (s.user) s.user.avatarUrl = null;
    });

    b.addCase(staffLogout.fulfilled, (s) => {
      s.token = null;
      s.user = null;
      s.role = null;
      s.otpSentTo = null;
      setStoredStaffRole(null);
    });

    b.addCase(updateStaffLanguage.fulfilled, (s, a) => {
      if (s.user) {
        s.user.preferredLanguage = a.payload.preferred_language;
      }
    });

    b.addCase(updateStaffTheme.fulfilled, (s, a) => {
      if (s.user) {
        s.user.preferredTheme = a.payload.preferred_theme;
      }
    });
  },
});

export const { clearStaffError, setStaffPreferredTheme, restoreStaffRoleFromToken } =
  slice.actions;
export default slice.reducer;
