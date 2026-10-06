import { useCallback } from "react";
import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setAthletePreferredTheme,
  updateAthleteTheme,
} from "@/store/slices/athleteAuthSlice";
import {
  setStaffPreferredTheme,
  updateStaffTheme,
} from "@/store/slices/staffAuthSlice";
import { normalizeTheme, type AppTheme } from "@shared/theme";
import {
  resolveThemeAuthContext,
  setRealmStoredTheme,
} from "@shared/themePreference";

/** Persist theme to the active account (route-aware). Rolls back UI on PATCH failure. */
export function useThemePersistence() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const { setTheme, theme } = useTheme();
  const athleteToken = useAppSelector((s) => s.athleteAuth.token);
  const staffToken = useAppSelector((s) => s.staffAuth.token);
  const staffRole = useAppSelector((s) => s.staffAuth.role);

  return useCallback(
    (next: AppTheme) => {
      const normalized = normalizeTheme(next);
      const previous = normalizeTheme(theme ?? undefined);
      const context = resolveThemeAuthContext({
        pathname,
        athleteToken,
        staffToken,
        staffRole,
      });

      setTheme(normalized);
      setRealmStoredTheme(context, normalized);

      if (context === "guest") return;

      // Optimistic Redux update so ThemePreferenceSync does not revert mid-navigate.
      if (context === "staff") {
        dispatch(setStaffPreferredTheme(normalized));
      } else if (context === "athlete") {
        dispatch(setAthletePreferredTheme(normalized));
      }

      void (async () => {
        try {
          if (context === "staff" && staffRole) {
            const result = await dispatch(
              updateStaffTheme({ theme: normalized, role: staffRole }),
            );
            if (updateStaffTheme.rejected.match(result)) {
              setTheme(previous);
              setRealmStoredTheme(context, previous);
              dispatch(setStaffPreferredTheme(previous));
            }
            return;
          }

          if (context === "athlete") {
            const result = await dispatch(updateAthleteTheme(normalized));
            if (updateAthleteTheme.rejected.match(result)) {
              setTheme(previous);
              setRealmStoredTheme(context, previous);
              dispatch(setAthletePreferredTheme(previous));
            }
          }
        } catch {
          setTheme(previous);
          setRealmStoredTheme(context, previous);
          if (context === "staff") dispatch(setStaffPreferredTheme(previous));
          if (context === "athlete") dispatch(setAthletePreferredTheme(previous));
        }
      })();
    },
    [
      dispatch,
      pathname,
      athleteToken,
      staffToken,
      staffRole,
      setTheme,
      theme,
    ],
  );
}
