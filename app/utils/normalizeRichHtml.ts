/** TipTap empty / blank HTML variants that should compare as blank. */
export function normalizeRichHtmlForCompare(
  html: string | null | undefined,
): string {
  const t = String(html ?? "").trim();
  if (
    !t ||
    t === "<p></p>" ||
    t === "<p><br></p>" ||
    t === "<p><br/></p>"
  ) {
    return "";
  }
  return t;
}
