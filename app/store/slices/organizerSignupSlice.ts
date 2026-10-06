import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { detectBrowserLocale, getStoredLocale, normalizeLocale } from "@shared/i18n";
import type {
  OrganizerExpectedSizeBand,
  PublicOrganizerRegisterRequest,
  PublicOrganizerRegisterResponse,
} from "@shared/api";

export type OrganizerSignupStep =
  | "welcome"
  | "owner"
  | "organization"
  | "intake"
  | "verify";

export interface OrganizerSignupForm {
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  geoStateId: number | null;
  geoCityId: number | null;
  sportTypeId: number | null;
  eventName: string;
  roughDate: string;
  expectedSize: OrganizerExpectedSizeBand | "";
}

const initialForm: OrganizerSignupForm = {
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  ownerPhone: "",
  name: "",
  email: "",
  phone: "",
  city: "",
  geoStateId: null,
  geoCityId: null,
  sportTypeId: null,
  eventName: "",
  roughDate: "",
  expectedSize: "",
};

interface OrganizerSignupState {
  step: OrganizerSignupStep;
  form: OrganizerSignupForm;
  registering: boolean;
  registerError: string | null;
  registeredOrganizer: PublicOrganizerRegisterResponse["organizer"] | null;
}

const initialState: OrganizerSignupState = {
  step: "welcome",
  form: initialForm,
  registering: false,
  registerError: null,
  registeredOrganizer: null,
};

function buildRegisterPayload(
  form: OrganizerSignupForm,
  locale: string,
): PublicOrganizerRegisterRequest {
  const orgEmail = form.email.trim() || form.ownerEmail.trim();
  return {
    owner_first_name: form.ownerFirstName.trim(),
    owner_last_name: form.ownerLastName.trim(),
    owner_email: form.ownerEmail.trim().toLowerCase(),
    owner_phone: form.ownerPhone.trim() || undefined,
    name: form.name.trim(),
    email: orgEmail.toLowerCase(),
    phone: form.phone.trim() || undefined,
    city: form.city.trim(),
    country: "MX",
    locale: normalizeLocale(locale),
    intake: {
      event_name: form.eventName.trim() || null,
      sport_type_id: form.sportTypeId,
      rough_date: form.roughDate.trim() || null,
      expected_size: form.expectedSize || null,
    },
  };
}

export const registerOrganizerSelfService = createAsyncThunk<
  PublicOrganizerRegisterResponse,
  { locale?: string } | void,
  { state: { organizerSignup: OrganizerSignupState }; rejectValue: string }
>("organizerSignup/register", async (arg, { getState, rejectWithValue }) => {
  const { form } = getState().organizerSignup;
  const locale =
    (arg && typeof arg === "object" ? arg.locale : undefined) ||
    getStoredLocale() ||
    detectBrowserLocale();
  try {
    const { data } = await api.post<PublicOrganizerRegisterResponse>(
      "/public/organizers/register",
      buildRegisterPayload(form, locale),
    );
    return data;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    return rejectWithValue(
      err?.response?.data?.error || "Could not complete registration.",
    );
  }
});

const organizerSignupSlice = createSlice({
  name: "organizerSignup",
  initialState,
  reducers: {
    setOrganizerSignupStep(state, action: PayloadAction<OrganizerSignupStep>) {
      state.step = action.payload;
      state.registerError = null;
    },
    patchOrganizerSignupForm(state, action: PayloadAction<Partial<OrganizerSignupForm>>) {
      state.form = { ...state.form, ...action.payload };
    },
    resetOrganizerSignup(state) {
      Object.assign(state, initialState);
    },
    clearOrganizerRegisterError(state) {
      state.registerError = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(registerOrganizerSelfService.pending, (s) => {
      s.registering = true;
      s.registerError = null;
    });
    b.addCase(registerOrganizerSelfService.fulfilled, (s, a) => {
      s.registering = false;
      s.registeredOrganizer = a.payload.organizer;
      s.step = "verify";
    });
    b.addCase(registerOrganizerSelfService.rejected, (s, a) => {
      s.registering = false;
      s.registerError = a.payload || "Could not complete registration.";
    });
  },
});

export const {
  setOrganizerSignupStep,
  patchOrganizerSignupForm,
  resetOrganizerSignup,
  clearOrganizerRegisterError,
} = organizerSignupSlice.actions;

export default organizerSignupSlice.reducer;
