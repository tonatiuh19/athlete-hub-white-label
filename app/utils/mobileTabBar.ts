/**
 * Public site chrome helpers.
 * Athlete-marketplace floating tab bar was removed for Atleita white-label.
 */

/** Event entry routes where Atleita site navbar yields to organizer chrome. */
export function shouldHidePublicSiteNavbar(pathname: string): boolean {
  if (pathname === "/events" || pathname === "/events/") return false;
  return pathname.startsWith("/events/");
}
