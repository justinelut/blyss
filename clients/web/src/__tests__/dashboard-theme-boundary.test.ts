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

  test("uses theme tokens for dashboard panels and product selectors", () => {
    const dashboard = read("src/components/Layout/DashboardLayout.tsx");
    const select = read("src/components/atoms/Select.tsx");
    const createProduct = read(
      "src/app/(main)/dashboard/[organization]/(header)/products/new/page.tsx",
    );
    const products = read(
      "src/app/(main)/dashboard/[organization]/(header)/products/ProductsPage.tsx",
    );

    expect(dashboard).toContain("bg-[var(--surface)]");
    expect(dashboard).toContain("text-[var(--text-primary)]");
    expect(select).toContain("bg-[var(--surface-sunken)]");
    expect(select).toContain("bg-[var(--surface-elevated)]");
    expect(createProduct).toContain("export const dynamic = 'force-dynamic'");
    expect(createProduct).toContain("export const revalidate = 0");
    expect(createProduct).toContain("    true,");
    expect(products.match(/prefetch=\{false\}/g)).toHaveLength(2);
  });

  test("keeps typography plugin utilities in the single global stylesheet", () => {
    const globals = read("src/styles/globals.css");
    const pricing = read(
      "src/components/Products/ProductForm/ProductPricingSection.tsx",
    );

    expect(globals).toContain("@plugin '@tailwindcss/typography'");
    expect(pricing).not.toContain("styles/typography.css");
  });

  test("defaults to dark and supports the explicit system preference", () => {
    const providers = read("src/app/providers.tsx");

    expect(providers).toContain('defaultTheme="dark"');
    expect(providers).toContain("enableSystem");
    expect(providers).toContain('storageKey="blyss-theme"');
  });
});
