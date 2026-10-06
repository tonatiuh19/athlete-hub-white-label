import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_LEGAL_ENTITY } from "../../shared/siteLegal.js";
import { applyLegalTemplate } from "../../app/utils/legalTemplate.js";

const root = resolve(import.meta.dirname, "../..");

function loadLegal(locale: "es" | "en", file: string): string {
  return readFileSync(
    resolve(root, `app/content/legal/${locale}/${file}`),
    "utf8",
  );
}

describe("legal documents — Atleita platform-only liability (MX)", () => {
  it("bumps lastUpdated on the published legal entity defaults", () => {
    expect(DEFAULT_LEGAL_ENTITY.lastUpdated).toBe("2026-10-02");
  });

  it("ES terms: Atleita does not own events; organizer bears event liability", () => {
    const rendered = applyLegalTemplate(
      loadLegal("es", "terms-of-service.md"),
      DEFAULT_LEGAL_ENTITY,
    );
    expect(rendered).toMatch(/no es dueño/i);
    expect(rendered).toMatch(/facilitación de transacciones/i);
    expect(rendered).toMatch(/exclusivamente entre el Usuario y el Organizador/i);
    expect(rendered).toMatch(/artículo 90 de la LFPC/i);
    expect(rendered).toMatch(/leyes de los Estados Unidos Mexicanos/i);
    expect(rendered).toContain("2026-10-02");
  });

  it("EN terms: mirror ownership and facilitator language", () => {
    const rendered = applyLegalTemplate(
      loadLegal("en", "terms-of-service.md"),
      DEFAULT_LEGAL_ENTITY,
    );
    expect(rendered).toMatch(/does not own/i);
    expect(rendered).toMatch(/payment-transaction facilitation/i);
    expect(rendered).toMatch(/exclusively between the User and the Organizer/i);
    expect(rendered).toMatch(/LFPC Article 90/i);
  });

  it("ES privacy: organizer is receiving controller, not mere encargado", () => {
    const rendered = applyLegalTemplate(
      loadLegal("es", "privacy-notice.md"),
      DEFAULT_LEGAL_ENTITY,
    );
    expect(rendered).toMatch(/responsable receptor/i);
    expect(rendered).toMatch(/LFPDPPP/i);
    expect(rendered).toMatch(/artículo 36/i);
    expect(rendered).toMatch(/Stripe/i);
  });

  it("ES organizer terms: exclusive ownership + no solidary liability for sporting service", () => {
    const rendered = applyLegalTemplate(
      loadLegal("es", "organizer-terms.md"),
      DEFAULT_LEGAL_ENTITY,
    );
    expect(rendered).toMatch(/único propietario y responsable jurídico del evento/i);
    expect(rendered).toMatch(/no existe responsabilidad solidaria/i);
    expect(rendered).toMatch(/responsable receptor/i);
    expect(rendered).toMatch(/seguros/i);
  });
});
