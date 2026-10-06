import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Regression: organizer self-service register depends on organizers +
 * organizer_members columns that were missing on some TiDB dumps
 * (public_uuid, invited_at) even though hardening was marked applied.
 */
describe("core organizer register schema contract", () => {
  it("registerSelfServiceOrganizer inserts public_uuid + invited_at", () => {
    const src = readFileSync(
      path.resolve("server/organizerRegistration.ts"),
      "utf8",
    );
    expect(src).toMatch(/INSERT INTO organizers\s*\([\s\S]*public_uuid/);
    expect(src).toMatch(
      /INSERT INTO organizer_members\s*\([\s\S]*invited_at/,
    );
  });

  it("schema.sql defines public_uuid + invited_at on organizer tables", () => {
    const schema = readFileSync(path.resolve("database/schema.sql"), "utf8");
    expect(schema).toMatch(
      /CREATE TABLE `organizers`[\s\S]*?`public_uuid` char\(36\)/,
    );
    expect(schema).toMatch(
      /CREATE TABLE `organizer_members`[\s\S]*?`invited_at`/,
    );
  });

  it("ships ensure + align migrations for drifted TiDB dumps", () => {
    const ensure = readFileSync(
      path.resolve(
        "database/migrations/20261005_190000_ensure_core_public_uuid.sql",
      ),
      "utf8",
    );
    const align = readFileSync(
      path.resolve(
        "database/migrations/20261005_220000_align_core_schema_columns.sql",
      ),
      "utf8",
    );
    expect(ensure).toContain("ADD COLUMN IF NOT EXISTS `public_uuid`");
    expect(align).toContain("`invited_at`");
    expect(align).toContain("`billing_email`");
  });
});
