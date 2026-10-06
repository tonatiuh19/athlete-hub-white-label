import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { GeoCity, GeoResolvedPlace, GeoState } from "@shared/api";

interface GeoStateSlice {
  states: GeoState[];
  citiesByStateId: Record<number, GeoCity[]>;
  placeByKey: Record<string, GeoResolvedPlace | null>;
  loadingStates: boolean;
  loadingCities: boolean;
  loadingPlaceKeys: Record<string, boolean>;
  statesError: string | null;
  citiesError: string | null;
}

const initialState: GeoStateSlice = {
  states: [],
  citiesByStateId: {},
  placeByKey: {},
  loadingStates: false,
  loadingCities: false,
  loadingPlaceKeys: {},
  statesError: null,
  citiesError: null,
};

export function buildPlaceResolveKey(input: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}): string {
  return [
    input.country ?? "MX",
    input.city ?? "",
    input.state ?? "",
    input.name ?? "",
    input.lat ?? "",
    input.lng ?? "",
  ]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
}

export const fetchGeoStates = createAsyncThunk<GeoState[], string | undefined>(
  "geo/states",
  async (country) => {
    const { data } = await api.get("/geo/states", {
      params: { country: country ?? "MX" },
    });
    return data.states as GeoState[];
  },
);

export const fetchGeoCities = createAsyncThunk(
  "geo/cities",
  async ({
    stateId,
    q,
    country = "MX",
  }: {
    stateId?: number;
    q?: string;
    country?: string;
  }) => {
    const { data } = await api.get("/geo/cities", {
      params: {
        country,
        state_id: stateId,
        q: q?.trim() || undefined,
      },
    });
    return {
      stateId: stateId ?? 0,
      cities: data.cities as GeoCity[],
    };
  },
);

export const resolvePlaceCoordinates = createAsyncThunk(
  "geo/resolvePlace",
  async (input: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
    name?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
  }) => {
    const key = buildPlaceResolveKey(input);
    const { data } = await api.get<{ place: GeoResolvedPlace | null }>(
      "/geo/resolve-place",
      {
        params: {
          country: input.country ?? "MX",
          city: input.city?.trim() || undefined,
          state: input.state?.trim() || undefined,
          name: input.name?.trim() || undefined,
          lat: input.lat ?? undefined,
          lng: input.lng ?? undefined,
        },
      },
    );
    return { key, place: data.place ?? null };
  },
);

const geoSlice = createSlice({
  name: "geo",
  initialState,
  reducers: {
    clearGeoCities(state) {
      state.citiesByStateId = {};
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchGeoStates.pending, (s) => {
      s.loadingStates = true;
      s.statesError = null;
    });
    b.addCase(fetchGeoStates.fulfilled, (s, a) => {
      s.loadingStates = false;
      s.states = a.payload;
    });
    b.addCase(fetchGeoStates.rejected, (s, a) => {
      s.loadingStates = false;
      s.statesError = a.error.message ?? "Failed to load states";
    });
    b.addCase(fetchGeoCities.pending, (s) => {
      s.loadingCities = true;
      s.citiesError = null;
    });
    b.addCase(fetchGeoCities.fulfilled, (s, a) => {
      s.loadingCities = false;
      if (a.payload.stateId) {
        s.citiesByStateId[a.payload.stateId] = a.payload.cities;
        return;
      }
      for (const city of a.payload.cities) {
        const existing = s.citiesByStateId[city.state_id] ?? [];
        if (!existing.some((c) => c.id === city.id)) {
          s.citiesByStateId[city.state_id] = [...existing, city];
        }
      }
    });
    b.addCase(fetchGeoCities.rejected, (s, a) => {
      s.loadingCities = false;
      s.citiesError = a.error.message ?? "Failed to load cities";
    });
    b.addCase(resolvePlaceCoordinates.pending, (s, a) => {
      const key = buildPlaceResolveKey(a.meta.arg);
      s.loadingPlaceKeys[key] = true;
    });
    b.addCase(resolvePlaceCoordinates.fulfilled, (s, a) => {
      s.loadingPlaceKeys[a.payload.key] = false;
      s.placeByKey[a.payload.key] = a.payload.place;
    });
    b.addCase(resolvePlaceCoordinates.rejected, (s, a) => {
      const key = buildPlaceResolveKey(a.meta.arg);
      s.loadingPlaceKeys[key] = false;
      if (s.placeByKey[key] === undefined) {
        s.placeByKey[key] = null;
      }
    });
  },
});

export const { clearGeoCities } = geoSlice.actions;
export default geoSlice.reducer;
