/**
 * Vercel serverless gate for athlete-hub: api/index.ts may import
 * ../server/** and ../shared/** (see vercel.json includeFiles) and ./testHooks
 * for test hooks. Sibling api/*.ts runtime imports still break prod bundles.
 *
 * Usage: npx tsx scripts/check-api-inline.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_API_INDEX = path.resolve(__dirname, "../api/index.ts");

/** Relative specifiers allowed as runtime imports from api/index.ts */
const ALLOWED_RUNTIME_PREFIXES = ["../server/", "../shared/"];
const ALLOWED_RUNTIME_EXACT = new Set(["./testHooks", "./testHooks.js"]);

export type InlineViolation = {
  line: number;
  kind: "import" | "export" | "dynamic_import" | "require";
  specifier: string;
  snippet: string;
};

/** Strip // and /* *\/ comments without touching string contents (best-effort). */
export function stripTsComments(source: string): string {
  let out = "";
  let i = 0;
  let state: "code" | "sq" | "dq" | "tpl" | "line" | "block" = "code";
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (state === "code") {
      if (c === "/" && n === "/") {
        state = "line";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === "/" && n === "*") {
        state = "block";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === "'") {
        state = "sq";
        out += c;
        i++;
        continue;
      }
      if (c === '"') {
        state = "dq";
        out += c;
        i++;
        continue;
      }
      if (c === "`") {
        state = "tpl";
        out += c;
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += c;
      } else {
        out += " ";
      }
      i++;
      continue;
    }
    if (state === "block") {
      if (c === "*" && n === "/") {
        state = "code";
        out += "  ";
        i += 2;
        continue;
      }
      out += c === "\n" ? "\n" : " ";
      i++;
      continue;
    }
    if (c === "\\" && i + 1 < source.length) {
      out += c + source[i + 1];
      i += 2;
      continue;
    }
    if (
      (state === "sq" && c === "'") ||
      (state === "dq" && c === '"') ||
      (state === "tpl" && c === "`")
    ) {
      state = "code";
    }
    out += c;
    i++;
  }
  return out;
}

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

function snippetAt(source: string, index: number): string {
  const start = source.lastIndexOf("\n", index - 1) + 1;
  let end = source.indexOf("\n", index);
  if (end < 0) end = source.length;
  return source.slice(start, end).trim().slice(0, 160);
}

function isRelativeSpecifier(spec: string): boolean {
  return (
    spec.startsWith("./") ||
    spec.startsWith("../") ||
    spec === "." ||
    spec === ".."
  );
}

function isAllowedRuntimeRelative(spec: string): boolean {
  if (ALLOWED_RUNTIME_EXACT.has(spec)) return true;
  return ALLOWED_RUNTIME_PREFIXES.some((prefix) => spec.startsWith(prefix));
}

export function findApiInlineViolations(source: string): InlineViolation[] {
  const cleaned = stripTsComments(source);
  const violations: InlineViolation[] = [];

  const staticRe =
    /\b(import|export)(\s+type)?\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(cleaned)) !== null) {
    const kindRaw = m[1] as "import" | "export";
    const typeKeyword = Boolean(m[2]);
    const specifier = m[4];
    if (!isRelativeSpecifier(specifier)) continue;
    if (typeKeyword) continue;
    if (isAllowedRuntimeRelative(specifier)) continue;
    violations.push({
      line: lineNumberAt(cleaned, m.index),
      kind: kindRaw,
      specifier,
      snippet: snippetAt(source, m.index),
    });
  }

  const dynImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = dynImportRe.exec(cleaned)) !== null) {
    const specifier = m[1];
    if (!isRelativeSpecifier(specifier)) continue;
    if (isAllowedRuntimeRelative(specifier)) continue;
    violations.push({
      line: lineNumberAt(cleaned, m.index),
      kind: "dynamic_import",
      specifier,
      snippet: snippetAt(source, m.index),
    });
  }

  const requireRe = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = requireRe.exec(cleaned)) !== null) {
    const specifier = m[1];
    if (!isRelativeSpecifier(specifier)) continue;
    if (isAllowedRuntimeRelative(specifier)) continue;
    violations.push({
      line: lineNumberAt(cleaned, m.index),
      kind: "require",
      specifier,
      snippet: snippetAt(source, m.index),
    });
  }

  return violations;
}

export function formatApiInlineReport(
  fileLabel: string,
  violations: InlineViolation[],
): string {
  if (violations.length === 0) {
    return `✅ ${fileLabel}: Vercel-safe api/index.ts bundle (server/** + shared/** + testHooks only).`;
  }
  const lines = [
    `❌ ${fileLabel}: disallowed relative runtime imports for Vercel api/index.ts.`,
    `   Allowed: ../server/*, ../shared/*, ./testHooks — see vercel.json includeFiles.`,
    "",
  ];
  for (const v of violations) {
    lines.push(
      `   L${v.line} [${v.kind}] ${v.specifier}`,
      `      ${v.snippet}`,
    );
  }
  return lines.join("\n");
}

export function checkApiIndexInline(filePath = DEFAULT_API_INDEX): {
  ok: boolean;
  report: string;
  violations: InlineViolation[];
} {
  const source = fs.readFileSync(filePath, "utf8");
  const violations = findApiInlineViolations(source);
  const label = path.relative(process.cwd(), filePath) || filePath;
  return {
    ok: violations.length === 0,
    report: formatApiInlineReport(label, violations),
    violations,
  };
}

function main() {
  const result = checkApiIndexInline();
  console.log(`\n${result.report}\n`);
  if (!result.ok) process.exit(1);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
