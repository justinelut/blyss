import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("Homepage marketplace structure", () => {
  test("uses an Ecosystem Index rather than the old marquee document", () => {
    const home = read("src/app/(main)/(website)/(landing)/HomePage.tsx");
    expect(home).toMatch(/macrostructure: Ecosystem Index/);
    expect(home).toMatch(/newestProducts/);
    expect(home).toMatch(/newArrivals/);
    expect(home).not.toMatch(/Marquee Hero \+ Long Document/);
    expect(home).not.toMatch(/NoteFromMakers/);
  });

  test("opening is general, search-first, and contains one featured product", () => {
    const hero = read("src/components/Marketplace/Hero.tsx");
    expect(hero).toMatch(/What are you looking for\?/);
    expect(hero).toMatch(/role="search"/);
    expect(hero).toMatch(/featuredProduct/);
    expect(hero).not.toMatch(/Made in Kenya\.\s*\{?['"\s]*Useful everywhere/);
    expect(hero).not.toMatch(/MosaicTile|grid-cols-2/);
    expect(hero).not.toMatch(/useScroll|useTransform|parallax/i);
    expect(hero).not.toMatch(/absolute right-3 bottom-3 left-3/);
  });

  test("uses compact mobile gutters and overflow-safe hero tracks", () => {
    const hero = read("src/components/Marketplace/Hero.tsx");
    expect(hero).toMatch(/px-4/);
    expect(hero).toMatch(/md:px-8/);
    expect(hero).toMatch(/minmax\(0,5fr\).*minmax\(0,7fr\)/);
    expect(hero).toMatch(/leading-\[1\.06\]/);
  });

  test("homepage products are rows on phones with full external titles", () => {
    const card = read("src/components/Marketplace/HomepageProductCard.tsx");
    expect(card).toMatch(/grid-cols-\[112px_minmax\(0,1fr\)\]/);
    expect(card).toMatch(/sm:block/);
    expect(card).not.toMatch(/line-clamp/);
    expect(card).not.toMatch(/Add to cart|CardWishlistButton/);
    expect(card).toMatch(/KSh /);
    expect(card).toMatch(/US\$/);
  });

  test("hero product is removed from the product rails", () => {
    const home = read("src/app/(main)/(website)/(landing)/HomePage.tsx");
    expect(home).toMatch(/product\.id !== featuredProduct\?\.id/);
    expect(home).toMatch(/!usedProductIds\.has\(product\.id\)/);
  });
});

describe("Homepage responsive discovery surfaces", () => {
  test("category index starts at one column and has no square title tiles", () => {
    const categories = read("src/components/Marketplace/BrowseByCraft.tsx");
    expect(categories).toMatch(/grid-cols-1/);
    expect(categories).toMatch(/sm:grid-cols-2/);
    expect(categories).not.toMatch(/aspect-square/);
    expect(categories).toMatch(/break-words/);
  });

  test("mobile drawer and country selector support keyboard dismissal", () => {
    const header = read("src/components/Marketplace/MarketplaceHeader.tsx");
    const country = read(
      "src/components/Marketplace/CountrySwitcher.tsx",
    );

    expect(header).toMatch(/event\.key === ["']Escape["']/);
    expect(header).toMatch(/mobileMenuButtonRef\.current\?\.focus/);
    expect(header).toMatch(/aria-controls="marketplace-mobile-menu"/);
    expect(country).toMatch(/ArrowDown/);
    expect(country).toMatch(/ArrowUp/);
    expect(country).toMatch(/event\.key === ["']Escape["']/);
    expect(country).toMatch(/closeAndFocusTrigger/);
    expect(country).toMatch(/tabIndex=\{-1\}/);
  });

  test("fixed mobile navigation has footer safe-area clearance without a main gap", () => {
    const chrome = read("src/components/Marketplace/MarketplaceChrome.tsx");
    const footer = read("src/components/Marketplace/MarketplaceFooter.tsx");
    expect(chrome).not.toMatch(/safe-area-inset-bottom/);
    expect(footer).toMatch(
      /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/,
    );
  });

  test("footer does not use the overflow-prone tablet 12-column grid", () => {
    const footer = read("src/components/Marketplace/MarketplaceFooter.tsx");
    expect(footer).not.toMatch(/md:grid-cols-12|md:gap-16/);
    expect(footer).toMatch(/minmax\(280px,2fr\)/);
    expect(footer).toMatch(/grid-cols-2/);
  });
});

describe("Self-hosted country detection contracts", () => {
  test("only a switcher-marked cookie outranks fresh Cloudflare geo", () => {
    const geo = read("src/lib/geo/middleware.ts");
    const provider = read("src/components/Marketplace/CurrencyProvider.tsx");
    expect(geo).toMatch(/cookieSource === ["']user["']/);
    expect(geo.indexOf("cookieSource ===")).toBeLessThan(
      geo.indexOf("cf-ipcountry"),
    );
    expect(provider).toMatch(/COUNTRY_SOURCE_COOKIE/);
    expect(provider).toMatch(/=user;/);
  });

  test("missing edge geo falls through browser region to Kenya, not Oracle", () => {
    const geo = read("src/lib/geo/middleware.ts");
    const index = read("src/lib/geo/index.ts");
    expect(geo).toMatch(/accept-language/);
    expect(geo).not.toMatch(/x-forwarded-for|cf-connecting-ip/);
    expect(index).toMatch(/DEFAULT_COUNTRY = ['"]ke['"]/);
  });
});
