import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("Dashboard theme token boundary", () => {
  test("keeps core Blyss tokens owned by tokens.css", () => {
    const globals = read("src/styles/globals.css");

    expect(globals).not.toContain("--border: var(--border)");
    expect(globals).not.toContain("--accent: var(--surface-sunken)");
    expect(globals).toContain("--color-input: var(--border)");
    expect(globals).toContain("--color-ring: var(--accent)");
    expect(globals).toContain("--color-accent: var(--surface-sunken)");
  });

  test("gives shared inputs explicit visible text and placeholder tokens", () => {
    const atomInput = read("src/components/atoms/Input.tsx");
    const shadInput = read("src/components/ui/input.tsx");

    expect(atomInput).toContain("bg-[var(--surface-sunken)]");
    expect(atomInput).toContain("text-[var(--text-primary)]");
    expect(atomInput).toContain("placeholder:text-[var(--text-secondary)]");
    expect(shadInput).toContain("text-foreground");
    expect(shadInput).toContain("placeholder:text-[var(--text-secondary)]");
  });

  test("defaults to light without following the operating system", () => {
    const providers = read("src/app/providers.tsx");

    expect(providers).toContain('defaultTheme="light"');
    expect(providers).toContain("enableSystem={false}");
    expect(providers).toContain('storageKey="blyss-theme"');
  });
});
