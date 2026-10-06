/**
 * Atleita is light-only. Kept as a no-op mount so App.tsx wiring stays stable.
 * Dark / system preferences are ignored platform-wide.
 */
export default function ThemePreferenceSync() {
  return null;
}
