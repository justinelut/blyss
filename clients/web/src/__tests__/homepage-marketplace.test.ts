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
    expect(hero).not.toMatch(/useCurrencyControls/);
    expect(hero).toMatch(/localizeMarketplaceHref/);
    expect(hero).toMatch(/country: string/);
    expect(hero).toMatch(/currency: string/);
    expect(hero).not.toMatch(/Templates · Ebooks · Beats · Presets · Courses/);
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
    const country = read("src/components/Marketplace/CountrySwitcher.tsx");

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

  test("footer contact avoids Cloudflare's render-blocking email decoder", () => {
    const footer = read("src/components/Marketplace/MarketplaceFooter.tsx");
    expect(footer).not.toMatch(/mailto:|@blyss\.co\.ke/);
    expect(footer).toMatch(/href="\/help"/);
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

describe("Public marketplace performance contracts", () => {
  test("does not preload legacy and optional storefront fonts globally", () => {
    const fonts = read("src/fonts/fonts.ts");

    expect(fonts).not.toMatch(/Inter-Light\.woff2/);
    expect(fonts).not.toMatch(/\.\/Inter-(Regular|Medium|SemiBold)\.woff2/);
    expect(fonts).toMatch(/export const inter = Inter\(\{/);
    for (const font of [
      "inter",
      "louize",
      "interDisplayFont",
      "cormorantGaramondFont",
      "interTightFont",
      "geistMono",
    ]) {
      expect(fonts).toMatch(
        new RegExp(`export const ${font} = [\\s\\S]*?preload: false`),
      );
    }
  });

  test("keeps Sentry out of passive anonymous route entry bundles", () => {
    const auth = read("src/hooks/auth.ts");
    const instrumentation = read("instrumentation-client.ts");
    const sentryClient = read("src/lib/monitoring/sentry-client.ts");

    expect(auth).not.toMatch(/import\(["']@sentry\/nextjs["']\)/);
    expect(auth).toMatch(/getSentryClient\(\)/);
    expect(instrumentation).not.toMatch(
      /import \* as Sentry from ["']@sentry\/nextjs["']/,
    );
    expect(sentryClient).toMatch(/import\(["']@sentry\/nextjs["']\)/);
    expect(auth).toMatch(/else if \(sentryUserSet\.current\)/);
  });

  test("defers PostHog without dropping queued analytics events", () => {
    const providers = read("src/app/providers.tsx");
    const posthogHook = read("src/hooks/posthog.ts");
    const deferredClient = read("src/providers/posthog.ts");
    const header = read("src/components/Marketplace/MarketplaceHeader.tsx");
    const continuity = read("src/components/Marketplace/ContinueShopping.tsx");

    expect(providers).not.toMatch(/import posthog from ["']posthog-js["']/);
    expect(providers).toMatch(/import\(["']posthog-js["']\)/);
    expect(posthogHook).not.toMatch(/posthog-js\/react/);
    expect(header).toMatch(/from ["']@\/hooks\/auth["']/);
    expect(continuity).toMatch(/from ["']@\/hooks\/auth["']/);
    expect(header).not.toMatch(/from ["']@\/hooks["']/);
    expect(continuity).not.toMatch(/from ["']@\/hooks["']/);
    expect(deferredClient).toMatch(/queue\.push\(operation\)/);
    expect(deferredClient).toMatch(/for \(const operation of queue\)/);
  });

  test("keeps the motion runtime out of always-loaded chrome and errors", () => {
    const header = read("src/components/Marketplace/MarketplaceHeader.tsx");
    const error = read("src/app/error.tsx");
    const creatorCard = read(
      "src/components/Marketplace/MarketplaceCreatorCard.tsx",
    );
    const productCard = read(
      "src/components/Marketplace/MarketplaceProductCard.tsx",
    );
    const mobileFilters = read(
      "src/components/Marketplace/BrowseMobileFilters.tsx",
    );
    const cartButton = read("src/components/Cart/CartButton.tsx");
    const notFound = read("src/app/not-found.tsx");
    const pageMotion = read("src/design/PageMotion.tsx");
    const skeleton = read("src/design/Skeleton.tsx");
    const inlineModal = read("src/components/Modal/InlineModal.tsx");
    const themeToggle = read("src/design/ThemeToggle.tsx");
    const blyssDialog = read("src/design/BlyssDialog.tsx");
    const statsStrip = read("src/components/Start/StartStatsStrip.tsx");

    for (const source of [
      header,
      error,
      creatorCard,
      productCard,
      mobileFilters,
      cartButton,
      notFound,
      pageMotion,
      skeleton,
      inlineModal,
      themeToggle,
      blyssDialog,
      statsStrip,
    ]) {
      expect(source).not.toMatch(/motion\/react|<motion\.|AnimatePresence/);
    }
    expect(header).toMatch(/motion-reduce:transition-none/);
    expect(creatorCard).toMatch(/motion-reduce:transform-none/);
    expect(productCard).toMatch(/motion-reduce:transform-none/);
    expect(skeleton).toMatch(/motion-reduce:animate-none/);
  });

  test("keeps cart query and drawer code out of passive marketplace bundles", () => {
    const button = read("src/components/Cart/CartButton.tsx");
    expect(button).toMatch(/dynamic\(/);
    expect(button).toMatch(/import\(["']\.\/CartCount["']\)/);
    expect(button).toMatch(/import\(["']\.\/CartDrawer["']\)/);
    expect(button).not.toMatch(/from ["']@\/hooks\/queries\/cart["']/);
    expect(button).toMatch(/\{open &&\s*<CartDrawer/);
  });

  test("hydrates browse data and preserves accessible public-route labels", () => {
    const browse = read("src/components/Marketplace/BrowsePage.tsx");
    const browseHeader = read(
      "src/components/Marketplace/BrowsePageHeader.tsx",
    );
    const creatorsHero = read("src/components/Marketplace/CreatorsHero.tsx");
    const creatorsHeader = read(
      "src/components/Marketplace/CreatorsPageHeader.tsx",
    );
    const footer = read("src/components/Marketplace/MarketplaceFooter.tsx");
    const newsletter = read("src/components/Marketplace/NewsletterSignup.tsx");
    const country = read("src/components/Marketplace/CountrySwitcher.tsx");
    const toast = read("src/components/Toast/index.tsx");
    const toastState = read("src/components/Toast/use-toast.ts");
    const deferredToaster = read("src/components/Toast/DeferredToaster.tsx");
    const marketplaceShell = read(
      "src/components/Marketplace/MarketplaceShell.tsx",
    );
    const categoriesQuery = read("src/hooks/queries/categories.ts");
    const creatorsDirectory = read(
      "src/components/Marketplace/CreatorsDirectoryPage.tsx",
    );
    const creatorsPage = read("src/app/(main)/creators/page.tsx");

    expect(browse).toMatch(/from ["']@\/hooks\/queries\/public-products["']/);
    expect(browse).toMatch(/initialData:\s*\{[\s\S]*items: initialProducts/);
    expect(browse).toMatch(/const BrowseFilterRail = dynamic/);
    expect(browse).toMatch(/\{isDesktop && \(/);
    expect(browse).toMatch(/\{mobileOpen && \(/);
    expect(browseHeader).toMatch(
      /<CategoryNavigation categories=\{categories\}/,
    );
    expect(categoriesQuery).toMatch(
      /enabled: options\?\.initialData === undefined/,
    );
    expect(creatorsDirectory).toMatch(/const categories = initialCategories/);
    expect(creatorsDirectory).not.toMatch(
      /useCreatorCategories|from ["']nuqs["']/,
    );
    expect(creatorsDirectory).toMatch(/window\.history\.replaceState/);
    expect(creatorsPage).toMatch(/initialCategories=\{creatorCategories\}/);
    expect(browseHeader).toMatch(/<Eyebrow accent>The marketplace/);
    expect(browseHeader).toMatch(/Find your next thing\./);
    expect(browse).not.toMatch(/<h1/);
    expect(creatorsHeader).toMatch(/<Eyebrow accent>Meet the makers/);
    expect(creatorsHeader).toMatch(/creative class, online/);
    expect(creatorsHero).not.toMatch(/<h1/);
    expect(footer).not.toMatch(/text-\[var\(--text-muted\)\]/);
    expect(newsletter).toMatch(
      /text-\[var\(--text-secondary\)\][^>]*>[\s\S]*Stay in touch/,
    );
    expect(country).toMatch(/aria-label=\{`\$\{CURRENCY_LABELS\[currency\]/);
    expect(toast).toMatch(/aria-label="Close notification"/);
    expect(marketplaceShell).toMatch(/<DeferredToaster/);
    expect(marketplaceShell).not.toMatch(/<Toaster/);
    expect(deferredToaster).toMatch(/dynamic\(\(\) =>/);
    expect(deferredToaster).toMatch(/blyss:toast-request/);
    expect(toastState).toMatch(/window\.dispatchEvent/);
  });

  test("keeps dependency-heavy renderers out of the public design barrel", () => {
    const design = read("src/design/index.ts");

    for (const heavyExport of [
      "LegalDoc",
      "Button",
      "Input",
      "ThemeToggle",
      "BlyssDialog",
    ]) {
      expect(design).not.toMatch(new RegExp(`export \\{[^}]*${heavyExport}`));
    }
  });
});
