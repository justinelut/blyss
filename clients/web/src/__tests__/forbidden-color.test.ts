import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Forbidden-color gate (plan/04-ui-direction.md §3.2).
 *
 * Two scopes, deliberately separated:
 *
 *  1. globals.css @theme — the off-brand "Etsy" orange ramp and the teal ramp
 *     must NOT exist. (blue/green/amber ramps are intentionally retained: the
 *     dashboard + charts depend on them, and per the project's no-dependency-
 *     removal / don't-break-the-dashboard rule we keep them. The MARKETPLACE
 *     surface is policed separately in scope 2.)
 *
 *  2. Marketplace surface components — must use zero forbidden color utilities
 *     (blue/green/teal/purple/violet/indigo/cyan), because the brand palette is
 *     the only allowed source there.
 */

const GLOBALS = join(process.cwd(), "src/styles/globals.css");

const MARKETPLACE_DIRS = [
  "src/components/Marketplace",
  "src/components/CreatorStorefront",
  "src/components/ProductDetail",
];

/**
 * Dead legacy components left on disk (no file/dependency removal per project
 * rule) but NOT rendered by any live route — superseded by the redesigned
 * components. They are excluded from the live-surface gate. If any of these is
 * ever re-imported into a live route, delete it from this list and bring it up
 * to spec.
 */
const LEGACY_EXCLUDED = new Set([
  "src/components/Marketplace/SearchBar.tsx",
  "src/components/Marketplace/FilterSidebar.tsx",
  "src/components/Marketplace/ProductGrid.tsx",
  "src/components/Marketplace/ProductCard.tsx",
  "src/components/Marketplace/CreatorCard.tsx",
  "src/components/Marketplace/HeroSection.tsx",
  "src/components/Marketplace/CurrencyDemo.tsx",
]);

const FORBIDDEN_UTILITIES = [
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-blue-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-teal-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-cyan-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-purple-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-violet-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-indigo-\d/,
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-green-\d/,
  /\bbg-gradient-to-/,
];

function collectFiles(dir: string): string[] {
  const abs = join(process.cwd(), dir);
  const out: string[] = [];
  try {
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry);
      if (statSync(full).isDirectory()) {
        out.push(...collectFiles(join(dir, entry)));
      } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes(".test.")) {
        out.push(full);
      }
    }
  } catch {
    /* dir may not exist */
  }
  return out;
}

describe("Forbidden colors — globals.css @theme", () => {
  const css = readFileSync(GLOBALS, "utf8");

  test('no "Etsy Marketplace Colors" comment', () => {
    expect(css).not.toMatch(/Etsy Marketplace Colors/i);
  });

  test("no off-brand --color-orange-* ramp (brand orange is --color-primary)", () => {
    expect(css).not.toMatch(/--color-orange-\d/);
  });

  test("no --color-teal-* ramp", () => {
    expect(css).not.toMatch(/--color-teal-\d/);
  });

  test("brand primary ramp is oxblood #9B352F", () => {
    expect(css).toMatch(/--color-primary:\s*#9B352F/i);
  });
});

describe("Forbidden colors — marketplace surface", () => {
  const files = MARKETPLACE_DIRS.flatMap(collectFiles).filter(
    (f) => !LEGACY_EXCLUDED.has(f.replace(process.cwd() + "/", "")),
  );

  test("marketplace component files exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.replace(process.cwd() + "/", "");
    test(`${rel} uses no forbidden color utilities`, () => {
      const content = readFileSync(file, "utf8");
      const hits = FORBIDDEN_UTILITIES.flatMap((p) => {
        const m = content.match(p);
        return m ? [`${m[0]} (${p})`] : [];
      });
      expect(hits, hits.join("\n")).toHaveLength(0);
    });
  }
});
