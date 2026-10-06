import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/api";

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

export type OrganizerSite = {
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
  events?: OrganizerMicrositeEvent[];
};

type OrganizerSiteState = {
  site: OrganizerSite | null;
  publicSite: OrganizerSite | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  publicError: string | null;
};

const initialState: OrganizerSiteState = {
  site: null,
  publicSite: null,
  loading: false,
  saving: false,
  error: null,
  publicError: null,
};

export const fetchOrganizerSite = createAsyncThunk<OrganizerSite>(
  "organizerSite/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ site: OrganizerSite }>("/organizer/site");
      return data.site;
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.error || e?.message || "load_failed",
      );
    }
  },
);

export const saveOrganizerSite = createAsyncThunk<
  OrganizerSite,
  {
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
  }
>("organizerSite/save", async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<{ site: OrganizerSite }>(
      "/organizer/site",
      body,
    );
    return data.site;
  } catch (e: any) {
    return rejectWithValue(
      e?.response?.data?.error || e?.message || "save_failed",
    );
  }
});

export const fetchPublicOrganizerSite = createAsyncThunk<
  OrganizerSite,
  string
>("organizerSite/fetchPublic", async (subdomain, { rejectWithValue }) => {
  try {
    const { data } = await api.get<{ site: OrganizerSite }>(
      `/sites/by-subdomain/${encodeURIComponent(subdomain)}`,
    );
    return data.site;
  } catch (e: any) {
    return rejectWithValue(
      e?.response?.data?.error || e?.message || "site_not_found",
    );
  }
});

const slice = createSlice({
  name: "organizerSite",
  initialState,
  reducers: {
    clearPublicOrganizerSite(s) {
      s.publicSite = null;
      s.publicError = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchOrganizerSite.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchOrganizerSite.fulfilled, (s, a) => {
      s.loading = false;
      s.site = a.payload;
    });
    b.addCase(fetchOrganizerSite.rejected, (s, a) => {
      s.loading = false;
      s.error = String(a.payload || "load_failed");
    });
    b.addCase(saveOrganizerSite.pending, (s) => {
      s.saving = true;
      s.error = null;
    });
    b.addCase(saveOrganizerSite.fulfilled, (s, a) => {
      s.saving = false;
      s.site = a.payload;
    });
    b.addCase(saveOrganizerSite.rejected, (s, a) => {
      s.saving = false;
      s.error = String(a.payload || "save_failed");
    });
    b.addCase(fetchPublicOrganizerSite.pending, (s) => {
      s.publicError = null;
    });
    b.addCase(fetchPublicOrganizerSite.fulfilled, (s, a) => {
      s.publicSite = a.payload;
    });
    b.addCase(fetchPublicOrganizerSite.rejected, (s, a) => {
      s.publicSite = null;
      s.publicError = String(a.payload || "site_not_found");
    });
  },
});

export const { clearPublicOrganizerSite } = slice.actions;
export default slice.reducer;
