import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Atleita has no Triboo communities/blog product", () => {
  it("does not ship blog/communities/teams/gamification server modules", () => {
    expect(existsSync(join(process.cwd(), "server/blog.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "server/publicTeams.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/pages/blog"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/pages/communities"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/store/slices/blogsSlice.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/store/slices/athleteTeamsSlice.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/store/slices/gamificationSlice.ts"))).toBe(false);
  });

  it("does not mount marketplace chrome or blog/communities routes", () => {
    const app = readFileSync(join(process.cwd(), "app/App.tsx"), "utf8");
    expect(app).not.toMatch(/AppMobileTabBar|PublicMobileBottomNav|BlogIndex|CommunitiesBrowse|AthleteTeams|StaffBlog/);
    expect(app).not.toContain('path="/blog"');
    expect(app).not.toContain('path="/communities"');
    expect(app).not.toContain('path="teams"');
    expect(app).not.toContain('path="achievements"');
  });

  it("does not link staff nav to blog", () => {
    const nav = readFileSync(join(process.cwd(), "app/utils/staffNav.ts"), "utf8");
    expect(nav).not.toMatch(/\/staff\/blog|BLOG_NAV|staffPortal\.nav\.blog/);
  });

  it("does not keep blog slug helpers or blog prose class", () => {
    const slugify = readFileSync(join(process.cwd(), "shared/slugify.ts"), "utf8");
    expect(slugify).not.toMatch(/normalizeBlogSlug|resolveBlogSlug|isValidBlogSlug|BLOG_SLUG/);
    const css = readFileSync(join(process.cwd(), "app/global.css"), "utf8");
    expect(css).not.toContain(".blog-prose");
    expect(css).toContain(".rich-prose");
  });

  it("does not expose blog/communities i18n product keys", () => {
    for (const loc of ["en", "es"] as const) {
      const catalog = readFileSync(
        join(process.cwd(), `app/i18n/locales/${loc}.json`),
        "utf8",
      );
      expect(catalog).not.toContain('"blogSectionTitle"');
      expect(catalog).not.toContain('"communitiesDesc"');
      expect(catalog).not.toMatch(/"tribes"\s*:\s*"/);
    }
  });
});
