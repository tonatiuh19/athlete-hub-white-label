import { describe, expect, it } from "vitest";
import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";

describe("normalizeRichHtmlForCompare", () => {
  it("treats TipTap empty paragraphs as blank", () => {
    expect(normalizeRichHtmlForCompare("")).toBe("");
    expect(normalizeRichHtmlForCompare(null)).toBe("");
    expect(normalizeRichHtmlForCompare("<p></p>")).toBe("");
    expect(normalizeRichHtmlForCompare("<p><br></p>")).toBe("");
    expect(normalizeRichHtmlForCompare("<p><br/></p>")).toBe("");
  });

  it("preserves non-empty html", () => {
    expect(normalizeRichHtmlForCompare("<p>Hello</p>")).toBe("<p>Hello</p>");
  });
});
