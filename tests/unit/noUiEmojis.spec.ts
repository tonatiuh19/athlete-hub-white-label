import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "app");

/**
 * Pictographs + common UI “emoji arrows” that must not appear in product copy/JSX.
 * Allows ASCII `->` and typographic em/en dashes in prose.
 */
const FORBIDDEN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|[↗↘↖↙↑↓←→⟶⟵✓✔✗★☆🏁🏅🏆⭐✨🔥🚀🎉⚠️✅❌❓✏️🏷️🧪💡]/u;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(tsx|ts|json|css)$/.test(name)) out.push(full);
  }
  return out;
}

function stripLineComments(line: string, inBlock: { value: boolean }): string {
  let s = line;
  if (inBlock.value) {
    const end = s.indexOf("*/");
    if (end === -1) return "";
    s = s.slice(end + 2);
    inBlock.value = false;
  }
  while (true) {
    const start = s.indexOf("/*");
    if (start === -1) break;
    const end = s.indexOf("*/", start + 2);
    if (end === -1) {
      s = s.slice(0, start);
      inBlock.value = true;
      break;
    }
    s = s.slice(0, start) + s.slice(end + 2);
  }
  const lineComment = s.indexOf("//");
  if (lineComment !== -1) s = s.slice(0, lineComment);
  return s;
}

describe("no emoji glyphs in product UI sources", () => {
  it("app/ JSX, CSS, and locale JSON stay emoji-free (comments ignored)", () => {
    const files = walk(ROOT);
    const hits: string[] = [];

    for (const file of files) {
      const rel = relative(process.cwd(), file);
      const text = readFileSync(file, "utf8");
      const isJson = file.endsWith(".json");
      const inBlock = { value: false };

      text.split(/\r?\n/).forEach((raw, idx) => {
        const line = isJson ? raw : stripLineComments(raw, inBlock);
        if (!line.trim()) return;
        // Mask bullet / password dots so they are not treated as icons.
        const cleaned = line.replace(/[•·]+/g, "");
        if (FORBIDDEN.test(cleaned)) {
          hits.push(`${rel}:${idx + 1}: ${raw.trim().slice(0, 120)}`);
        }
      });
    }

    expect(hits, hits.slice(0, 20).join("\n")).toEqual([]);
  });
});
