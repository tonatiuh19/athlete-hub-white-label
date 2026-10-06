import { describe, expect, it } from "vitest";
import {
  isRichHtmlEmpty,
  micrositeEventsStatusClause,
} from "../../server/organizerSites";
import {
  isOrganizerSiteLegalReadyFromDocs,
  isOrganizerSiteLegalDocKey,
} from "@/utils/organizerSiteLegal";

describe("organizer site legal readiness", () => {
  it("treats empty TipTap HTML as blank", () => {
    expect(isRichHtmlEmpty("")).toBe(true);
    expect(isRichHtmlEmpty("<p></p>")).toBe(true);
    expect(isRichHtmlEmpty("<p><br></p>")).toBe(true);
    expect(isRichHtmlEmpty("<p>Hola</p>")).toBe(false);
  });

  it("requires terms, privacy, and refund for ES", () => {
    expect(
      isOrganizerSiteLegalReadyFromDocs([
        { documentKey: "terms", locale: "es", bodyHtml: "<p>Términos</p>" },
        { documentKey: "privacy", locale: "es", bodyHtml: "<p>Privacidad</p>" },
        { documentKey: "refund", locale: "es", bodyHtml: "<p></p>" },
      ]),
    ).toBe(false);

    expect(
      isOrganizerSiteLegalReadyFromDocs([
        { documentKey: "terms", locale: "es", bodyHtml: "<p>Términos</p>" },
        { documentKey: "privacy", locale: "es", bodyHtml: "<p>Privacidad</p>" },
        { documentKey: "refund", locale: "es", bodyHtml: "<p>Reembolsos</p>" },
      ]),
    ).toBe(true);
  });

  it("validates legal document keys", () => {
    expect(isOrganizerSiteLegalDocKey("terms")).toBe(true);
    expect(isOrganizerSiteLegalDocKey("privacy")).toBe(true);
    expect(isOrganizerSiteLegalDocKey("refund")).toBe(true);
    expect(isOrganizerSiteLegalDocKey("other")).toBe(false);
  });
});

describe("micrositeEventsStatusClause", () => {
  it("includes draft and pending for editor preview", () => {
    const sql = micrositeEventsStatusClause(true);
    expect(sql).toContain("draft");
    expect(sql).toContain("pending_approval");
    expect(sql).toContain("published");
    expect(sql).not.toContain("visibility");
  });

  it("restricts public microsite to published + public visibility", () => {
    const sql = micrositeEventsStatusClause(false);
    expect(sql).toContain("published");
    expect(sql).toContain("visibility");
    expect(sql).toContain("public");
    expect(sql).not.toContain("draft");
    expect(sql).not.toContain("pending_approval");
  });
});
