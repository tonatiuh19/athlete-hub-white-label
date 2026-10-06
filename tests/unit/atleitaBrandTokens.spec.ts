import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Atleita brand tokens are platform-wide", () => {
  const css = readFileSync(join(process.cwd(), "app/global.css"), "utf8");
  const tw = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
  const button = readFileSync(join(process.cwd(), "app/components/ui/button.tsx"), "utf8");
  const input = readFileSync(join(process.cwd(), "app/components/ui/input.tsx"), "utf8");

  it("does not leave Triboo orange/blue-gray on :root chrome tokens", () => {
    expect(css).not.toMatch(/--sidebar-primary:\s*17\s+100%\s+56%/);
    expect(css).not.toMatch(/--nav-solid-border:\s*17\s+100%\s+56%/);
    expect(css).not.toMatch(/--page-gradient-start:\s*228\s+33%\s+97%/);
    expect(css).not.toMatch(/rgba\(255,\s*90,\s*31/);
  });

  it("uses Archivo on body and pace-site (no Inter Variable override)", () => {
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*Archivo/s);
    expect(css).toMatch(/\.pace-site\s*\{[^}]*font-family:\s*Archivo/s);
    expect(css).not.toContain("Inter Variable");
  });

  it("wires pace palette to atleita CSS variables", () => {
    expect(css).toContain("--pace-ink: var(--atleita-ink)");
    expect(css).toContain("--pace-green: var(--atleita-green)");
    expect(css).toContain("--pace-citron: var(--atleita-citron)");
  });

  it("uses crisp pace radii platform-wide (not soft SaaS 0.65rem)", () => {
    expect(css).toMatch(/--radius:\s*0\.1875rem/);
    expect(tw).toContain('xl: "3px"');
    expect(tw).toContain('sm: "2px"');
    expect(button).toContain("rounded-[3px]");
    expect(input).toContain("rounded-[2px]");
  });

  it("wraps staff and athlete consoles in pace-site", () => {
    const staff = readFileSync(
      join(process.cwd(), "app/components/layouts/StaffLayout.tsx"),
      "utf8",
    );
    const athlete = readFileSync(
      join(process.cwd(), "app/components/layouts/AthleteLayout.tsx"),
      "utf8",
    );
    expect(staff).toContain('className="pace-site');
    expect(staff).toContain("pace-wordmark");
    expect(athlete).toContain('className="pace-site');
    expect(athlete).toContain("pace-wordmark");
  });
});

describe("Public and organizer shells use pace marketing chrome", () => {
  it("wraps organizer + public routes in pace-site", () => {
    const layout = readFileSync(
      join(process.cwd(), "app/components/layouts/PublicSiteLayout.tsx"),
      "utf8",
    );
    expect(layout).not.toContain("bg-page-gradient");
    expect(layout).toContain('className="pace-site');
    expect(layout).toContain("atleita-organizer-page");
  });

  it("uses pace-header on organizer chrome (not rounded-xl glass)", () => {
    const header = readFileSync(
      join(process.cwd(), "app/components/layouts/AtleitaOrganizerHeader.tsx"),
      "utf8",
    );
    expect(header).toContain("pace-header");
    expect(header).toContain("pace-wordmark");
    expect(header).toContain("pace-header-enter");
    expect(header).not.toContain("rounded-xl");
    expect(header).not.toContain("backdrop-blur");
  });

  it("wires organizer signup to pace-wizard form system", () => {
    const wizard = readFileSync(
      join(process.cwd(), "app/pages/organizers/OrganizerSignupWizard.tsx"),
      "utf8",
    );
    expect(wizard).toContain("pace-wizard-sheet");
    expect(wizard).toContain("pace-form-field");
    expect(wizard).toContain("pace-wizard-next");
    expect(wizard).not.toContain("from \"@/components/ui/progress\"");
  });
});
