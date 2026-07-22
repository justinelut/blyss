import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("SEO indexing contracts", () => {
  test("sitemap lists current API-backed routes without fake freshness", () => {
    const source = read("src/app/sitemap.ts");

    expect(source).toContain("export const revalidate = 3600");
    expect(source).toContain('fetchPaginated<CategoryLite>("v1/categories")');
    expect(source).toContain("(category.product_count ?? 0) > 0");
    expect(source).not.toContain("`${SITE}/products`");
    expect(source).not.toContain("const now = new Date()");
    expect(source).not.toContain("CATEGORY_INTRO_SLUGS.map");
  });

  test("robots allows render assets and AI search while blocking private hosts", () => {
    const source = read("src/app/robots.ts");

    expect(source).toContain('userAgent: "OAI-SearchBot"');
    expect(source).toContain('userAgent: "Claude-SearchBot"');
    expect(source).toContain('host === "buy.blyss.co.ke"');
    expect(source).toContain('host === "my.blyss.co.ke"');
    expect(source).not.toContain('"/_next/"');
    expect(source).not.toContain('"/search"');
  });

  test("public policy pages own their canonical URLs", () => {
    const source = read("src/app/(main)/_legal.tsx");

    expect(source).toContain("alternates: { canonical: url }");
    expect(source).toContain('"privacy.md"');
    expect(source).toContain('"acceptable-use.md"');
  });

  test("analytics has one mount and deploy-time variable wiring", () => {
    const root = read("src/app/layout.tsx");
    const website = read("src/app/(main)/(website)/layout.tsx");
    const analytics = read("src/components/Analytics/AnalyticsTag.tsx");
    const dockerfile = read("Dockerfile");
    const workflow = read("../../.github/workflows/deploy.yml");

    expect(root).toContain("<AnalyticsTag />");
    expect(root).toContain("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION");
    expect(website).not.toContain("GoogleAnalytics");
    expect(analytics).toContain("CONFIG.GOOGLE_ANALYTICS_ID?.trim()");
    expect(dockerfile).toContain("ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID");
    expect(workflow).toContain("vars.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID");
  });

  test("private surfaces and generated search results cannot be indexed", () => {
    const checkout = read("src/app/checkout/layout.tsx");
    const portal = read("src/app/(main)/[organization]/portal/layout.tsx");
    const search = read("src/app/(main)/search/page.tsx");

    for (const source of [checkout, portal]) {
      expect(source).toContain("index: false");
      expect(source).toContain("follow: false");
    }
    expect(search).toContain("index: false, follow: true");
  });

  test("site-wide structured data never links to phantom categories", () => {
    const source = read("src/components/SEO/StructuredData.tsx");

    expect(source).toContain("url: `${ORIGIN}/categories`");
    expect(source).not.toContain("/category/notion-templates");
    expect(source).not.toContain("/category/lightroom-presets");
  });
});
