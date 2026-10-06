/** Post-login destination for athletes, preserving guest claim tokens. */
export function athletePostLoginPath(opts: {
  search?: string;
  from?: string | null;
}): string {
  const params = new URLSearchParams(opts.search ?? "");
  const claimToken = params.get("claimToken")?.trim();
  if (claimToken) {
    return `/portal/registrations?claimToken=${encodeURIComponent(claimToken)}`;
  }
  const from = opts.from?.trim();
  if (from && from.startsWith("/portal")) {
    return from;
  }
  return "/portal";
}
