import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { SitePublicProfile, SitePublicProfileResponse, AdminEmailSettingsResponse, ResendEventUpdatesTopicSetting } from "@shared/api";
import { DEFAULT_SITE_PUBLIC_PROFILE } from "@shared/siteLegal";

interface SiteAdminState {
  profile: SitePublicProfile;
  resendEventUpdatesTopicId: string;
  loading: boolean;
  loadingEmailSettings: boolean;
  saving: boolean;
  savingEmailSettings: boolean;
  error: string | null;
  saveError: string | null;
  emailSettingsError: string | null;
  emailSettingsSaveError: string | null;
  loaded: boolean;
  emailSettingsLoaded: boolean;
}

const initialState: SiteAdminState = {
  profile: DEFAULT_SITE_PUBLIC_PROFILE,
  resendEventUpdatesTopicId: "",
  loading: false,
  loadingEmailSettings: false,
  saving: false,
  savingEmailSettings: false,
  error: null,
  saveError: null,
  emailSettingsError: null,
  emailSettingsSaveError: null,
  loaded: false,
  emailSettingsLoaded: false,
};

export const fetchAdminSiteProfile = createAsyncThunk<
  SitePublicProfile,
  void,
  { rejectValue: string }
>("siteAdmin/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<SitePublicProfileResponse>("/admin/site-profile");
    return data.profile;
  } catch {
    return rejectWithValue("staffPortal.siteSettings.errors.loadFailed");
  }
});

export const updateAdminSiteProfile = createAsyncThunk<
  SitePublicProfile,
  SitePublicProfile,
  { rejectValue: string }
>("siteAdmin/updateProfile", async (profile, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<{ ok: boolean; profile: SitePublicProfile }>(
      "/admin/site-profile",
      profile,
    );
    return data.profile;
  } catch {
    return rejectWithValue("staffPortal.siteSettings.errors.saveFailed");
  }
});

export const fetchAdminEmailSettings = createAsyncThunk<
  ResendEventUpdatesTopicSetting,
  void,
  { rejectValue: string }
>("siteAdmin/fetchEmailSettings", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<AdminEmailSettingsResponse>("/admin/email-settings");
    return data.resendEventUpdatesTopic;
  } catch {
    return rejectWithValue("staffPortal.siteSettings.errors.emailSettingsLoadFailed");
  }
});

export const updateAdminEmailSettings = createAsyncThunk<
  ResendEventUpdatesTopicSetting,
  ResendEventUpdatesTopicSetting,
  { rejectValue: string }
>("siteAdmin/updateEmailSettings", async (resendEventUpdatesTopic, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<{
      ok: boolean;
      resendEventUpdatesTopic: ResendEventUpdatesTopicSetting;
    }>("/admin/email-settings", { resendEventUpdatesTopic });
    return data.resendEventUpdatesTopic;
  } catch {
    return rejectWithValue("staffPortal.siteSettings.errors.emailSettingsSaveFailed");
  }
});

const siteAdminSlice = createSlice({
  name: "siteAdmin",
  initialState,
  reducers: {
    clearSiteAdminErrors(state) {
      state.error = null;
      state.saveError = null;
      state.emailSettingsError = null;
      state.emailSettingsSaveError = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAdminSiteProfile.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchAdminSiteProfile.fulfilled, (s, a) => {
      s.loading = false;
      s.loaded = true;
      s.profile = a.payload;
    });
    b.addCase(fetchAdminSiteProfile.rejected, (s, a) => {
      s.loading = false;
      s.loaded = true;
      s.error = a.payload ?? "staffPortal.siteSettings.errors.loadFailed";
    });
    b.addCase(updateAdminSiteProfile.pending, (s) => {
      s.saving = true;
      s.saveError = null;
    });
    b.addCase(updateAdminSiteProfile.fulfilled, (s, a) => {
      s.saving = false;
      s.profile = a.payload;
    });
    b.addCase(updateAdminSiteProfile.rejected, (s, a) => {
      s.saving = false;
      s.saveError = a.payload ?? "staffPortal.siteSettings.errors.saveFailed";
    });

    b.addCase(fetchAdminEmailSettings.pending, (s) => {
      s.loadingEmailSettings = true;
      s.emailSettingsError = null;
    });
    b.addCase(fetchAdminEmailSettings.fulfilled, (s, a) => {
      s.loadingEmailSettings = false;
      s.emailSettingsLoaded = true;
      s.resendEventUpdatesTopicId = a.payload.topicId ?? "";
    });
    b.addCase(fetchAdminEmailSettings.rejected, (s, a) => {
      s.loadingEmailSettings = false;
      s.emailSettingsLoaded = true;
      s.emailSettingsError =
        a.payload ?? "staffPortal.siteSettings.errors.emailSettingsLoadFailed";
    });

    b.addCase(updateAdminEmailSettings.pending, (s) => {
      s.savingEmailSettings = true;
      s.emailSettingsSaveError = null;
    });
    b.addCase(updateAdminEmailSettings.fulfilled, (s, a) => {
      s.savingEmailSettings = false;
      s.resendEventUpdatesTopicId = a.payload.topicId ?? "";
    });
    b.addCase(updateAdminEmailSettings.rejected, (s, a) => {
      s.savingEmailSettings = false;
      s.emailSettingsSaveError =
        a.payload ?? "staffPortal.siteSettings.errors.emailSettingsSaveFailed";
    });
  },
});

export const { clearSiteAdminErrors } = siteAdminSlice.actions;
export default siteAdminSlice.reducer;
