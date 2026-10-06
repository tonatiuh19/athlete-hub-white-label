import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  readEventPreviewSchemeFromDocument,
  resolveEventPreviewScheme,
  type EventPreviewColorScheme,
} from "@shared/themePreference";

/** Defaults event page preview to the staff portal's resolved theme. */
export function useInitialEventPreviewScheme(): [
  EventPreviewColorScheme,
  (scheme: EventPreviewColorScheme) => void,
] {
  const { resolvedTheme } = useTheme();
  const [scheme, setScheme] = useState<EventPreviewColorScheme>(
    readEventPreviewSchemeFromDocument,
  );

  useEffect(() => {
    if (resolvedTheme === "dark" || resolvedTheme === "light") {
      setScheme(resolveEventPreviewScheme(resolvedTheme));
    }
  }, [resolvedTheme]);

  return [scheme, setScheme];
}
