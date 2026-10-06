import { describe, expect, it } from "vitest";
import {
  buildOrganizerBroadcastFrom,
  buildEventBroadcastEmail,
  extractFromEmailAddress,
} from "@shared/eventBroadcastEmail";
import { buildEventBroadcastTemplate } from "@shared/eventBroadcasts";

describe("eventBroadcastEmail", () => {
  it("builds organizer from line", () => {
    expect(
      buildOrganizerBroadcastFrom(
        "Trail MX",
        "Atleita <no-reply@disruptinglabs.com>",
      ),
    ).toBe("Trail MX via Atleita <no-reply@disruptinglabs.com>");
  });

  it("extracts from address", () => {
    expect(extractFromEmailAddress("Atleita <hello@example.com>")).toBe(
      "hello@example.com",
    );
  });

  it("renders preview html with sample name", () => {
    const html = buildEventBroadcastEmail({
      locale: "es",
      preheader: "Hola",
      title: "Actualización",
      bodyHtml: "<p>Hola {{{contact.first_name|atleta}}}</p>",
      organizerName: "Trail MX",
      appUrl: "https://atleita.com",
      previewMode: true,
    });
    expect(html).toContain("María");
    expect(html).toContain("Trail MX vía Atleita");
    expect(html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("keeps resend unsubscribe placeholder in send mode", () => {
    const html = buildEventBroadcastEmail({
      locale: "en",
      preheader: "Hi",
      title: "Update",
      bodyHtml: "<p>Hi there</p>",
      organizerName: "Org",
      appUrl: "https://atleita.com",
      previewMode: false,
    });
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });
});

describe("eventBroadcast templates", () => {
  it("interpolates event context", () => {
    const tpl = buildEventBroadcastTemplate("race_day_reminder", "en", {
      eventTitle: "10K CDMX",
      organizerName: "Trail MX",
      eventDateLabel: "Sunday",
      eventLocation: "Bosque de Chapultepec",
    });
    expect(tpl.subject).toContain("10K CDMX");
    expect(tpl.bodyHtml).toContain("Trail MX");
    expect(tpl.bodyHtml).toContain("{{{contact.first_name|athlete}}}");
  });
});
