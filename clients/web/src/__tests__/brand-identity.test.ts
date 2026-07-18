import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Brand identity gate.
 *
 * Locks down two invariants:
 *
 *  1. Checkout merchant-of-record copy says "Blyss" — never
 *     "Polar Software, Inc.", never "Polar" used as the merchant name.
 *     A buyer reading the consent text on the Pay button must see
 *     Blyss as the entity authorising the charge.
 *
 *  2. The favicon / Apple touch icon / in-app LogoIcon use a path-based
 *     geometric mark (rect + paths + circle), not a font-rendered <text>.
 *     Font-rendering depends on system fonts that browsers may or may
 *     not have, so a <text>-based favicon looks subtly different in
 *     every tab. Path geometry is identical everywhere.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("Brand identity", () => {
  describe("Merchant-of-record copy says Blyss", () => {
    const en = read("src/lib/i18n/locales/en.ts");

    test("en.ts no longer mentions Polar Software, Inc.", () => {
      expect(en).not.toContain("Polar Software, Inc.");
    });

    test("en.ts merchantOfRecord names Blyss", () => {
      expect(en).toMatch(/Merchant of Record,\s*Blyss/);
    });

    test("all three mandate variants reference Paystack", () => {
      // Mode A: Paystack handles the actual charge inside its
      // popup, so the mandate copy now points at Paystack as the
      // payment processor instead of describing Blyss as charging
      // the buyer directly.
      const occurrences = en.match(/Secured by Paystack/g);
      expect(occurrences?.length ?? 0).toBe(3);
    });

    test("every locale is in sync", () => {
      const locales = ["nl", "de", "sv", "it", "es", "hu", "fr", "pt", "pt-PT"];
      for (const code of locales) {
        const src = read(`src/lib/i18n/locales/${code}.ts`);
        expect(src).not.toContain("Polar Software, Inc.");
      }
    });
  });

  describe("Path-based geometric mark", () => {
    const icon = read("src/app/icon.svg");
    const apple = read("src/app/apple-icon.svg");
    const logoIcon = read("src/components/Brand/logos/LogoIcon.tsx");

    test("app/icon.svg uses path geometry, no <text>", () => {
      // Strip XML/HTML comments before checking so the gate doesn't trip
      // on a comment that mentions <text>.
      const naked = icon.replace(/<!--[\s\S]*?-->/g, "");
      expect(naked).not.toMatch(/<text[\s>]/);
      expect(naked).toMatch(/<path/);
      expect(naked).toMatch(/<circle/);
    });

    test("app/apple-icon.svg uses path geometry, no <text>", () => {
      const naked = apple.replace(/<!--[\s\S]*?-->/g, "");
      expect(naked).not.toMatch(/<text[\s>]/);
      expect(naked).toMatch(/<path/);
    });

    test("LogoIcon renders the same construction", () => {
      const naked = logoIcon.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(naked).not.toMatch(/<text[\s>]/);
      expect(naked).toMatch(/<path/);
      expect(naked).toMatch(/<circle/);
    });

    test("all three assets share the brand colours", () => {
      for (const asset of [icon, apple, logoIcon]) {
        expect(asset).toContain("#0F0E0C"); // charcoal tile
        expect(asset).toContain("#9B352F"); // accent dot
      }
    });
  });

  describe("Logo composition", () => {
    const logo = read("src/components/Brand/Logo.tsx");

    test("Logo.tsx is no longer a one-line stub", () => {
      // The old stub was a single line returning <span style={...}>Blyss</span>.
      expect(logo.length).toBeGreaterThan(500);
      expect(logo).toContain("variant?: 'icon' | 'wordmark' | 'lockup'");
    });

    test("Logo defaults to the icon + wordmark lockup", () => {
      expect(logo).toMatch(/variant\s*=\s*'lockup'/);
    });
  });
});
