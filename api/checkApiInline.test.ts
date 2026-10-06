import { describe, expect, it } from "vitest";
import {
  findApiInlineViolations,
  formatApiInlineReport,
  stripTsComments,
} from "../scripts/check-api-inline";

describe("check-api-inline (Vercel api bundle gate)", () => {
  it("allows server/, shared/, and testHooks imports", () => {
    const src = `
import type { StaffRole } from "../shared/api";
import { registerPhase2Routes } from "../server/phase2.js";
import { setTestPool } from "./testHooks.js";
import express from "express";
`;
    expect(findApiInlineViolations(src)).toEqual([]);
  });

  it("flags sibling api/*.ts runtime imports", () => {
    const src = `
import { foo } from "./eventBroadcasts";
import { bar } from "../server/phase2.js";
`;
    const v = findApiInlineViolations(src);
    expect(v).toHaveLength(1);
    expect(v[0].specifier).toBe("./eventBroadcasts");
  });

  it("allows export type from relative paths but flags sibling value re-exports", () => {
    const src = `
export type { X } from "../shared/api";
export { buildAlerts } from "./forbiddenSibling";
`;
    const v = findApiInlineViolations(src);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("export");
    expect(v[0].specifier).toBe("./forbiddenSibling");
  });

  it("flags dynamic import() of disallowed relative paths", () => {
    const src = `
async function load() {
  await import("./forbiddenSibling");
  await import("../server/ok.js");
}
`;
    const v = findApiInlineViolations(src);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("dynamic_import");
  });

  it("formats a failure report with guidance", () => {
    const report = formatApiInlineReport("api/index.ts", [
      {
        line: 10,
        kind: "import",
        specifier: "./forbidden",
        snippet: 'import { x } from "./forbidden";',
      },
    ]);
    expect(report).toContain("./forbidden");
    expect(report).toContain("L10");
  });
});

describe("stripTsComments", () => {
  it("preserves newlines for line numbers", () => {
    const raw = "a\n// hide\nb\n";
    const cleaned = stripTsComments(raw);
    expect(cleaned.split("\n")).toHaveLength(4);
    expect(cleaned.includes("hide")).toBe(false);
  });
});
