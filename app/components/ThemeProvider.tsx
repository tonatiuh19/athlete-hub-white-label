import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Atleita is light-only — dark mode is not offered.
 * Forced light prevents OS preference / stored dark prefs from applying.
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      storageKey="atleita-theme-forced-light"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
