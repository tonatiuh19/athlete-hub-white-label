/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { buildWelcomeStaffEmail } from "../../api/index";

describe("buildWelcomeStaffEmail", () => {
  it("builds a rich organizer welcome in EN from form locale", () => {
    const mail = buildWelcomeStaffEmail({
      locale: "en",
      firstName: "Felix",
      audience: "organizer",
      appUrl: "https://atleita.com",
    });

    expect(mail.subject).toMatch(/Welcome to Atleita/i);
    expect(mail.html).toContain("Everything in one platform");
    expect(mail.html).toContain("What you can do");
    expect(mail.html).toContain("Stripe Connect");
    expect(mail.html).toContain("Next steps");
    expect(mail.html).toContain("/staff");
    expect(mail.html).toContain("lang=\"en\"");
    expect(mail.text).toContain("Sign in with your email");
  });

  it("localizes organizer welcome in ES when signup locale is es", () => {
    const mail = buildWelcomeStaffEmail({
      locale: "es",
      firstName: "Félix",
      audience: "organizer",
      appUrl: "https://atleita.com",
    });

    expect(mail.subject).toMatch(/Bienvenido a Atleita/i);
    expect(mail.html).toContain("Todo en una plataforma");
    expect(mail.html).toContain("Qué puedes hacer");
    expect(mail.html).toContain("Próximos pasos");
    expect(mail.html).toContain("lang=\"es-MX\"");
    expect(mail.text).toContain("soporte@atleita.com");
  });

  it("keeps admin welcome short", () => {
    const mail = buildWelcomeStaffEmail({
      locale: "en",
      firstName: "Admin",
      audience: "admin",
      appUrl: "https://atleita.com",
    });

    expect(mail.subject).toMatch(/Staff Console/i);
    expect(mail.html).not.toContain("Everything in one platform");
    expect(mail.html).toContain("admin panel");
  });
});
