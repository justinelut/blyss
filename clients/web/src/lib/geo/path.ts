import { isSupportedCountry, normalizeCountry } from "./index";

/** Routes that are application internals rather than public marketplace pages. */
const INTERNAL_PREFIXES = [
  "/dashboard",
  "/finance",
  "/settings",
  "/onboarding",
  "/oauth2",
  "/api",
  "/checkout",
  "/_buy",
  "/_my",
  "/ingest",
  "/monitoring",
  "/docs",
] as const;

const pathOnly = (href: string): string => href.split(/[?#]/, 1)[0];

const isExternalHref = (href: string): boolean =>
  /^(?:[a-z]+:|\/\/|#|mailto:|tel:)/i.test(href);

const isInternalHref = (href: string): boolean => {
  const pathname = pathOnly(href);
  return INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

/** Return the country segment from a localized pathname, if present. */
export function countryFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|[?#]|$)/i);
  if (!match || !isSupportedCountry(match[1])) return null;
  return match[1].toLowerCase();
}

/**
 * Prefix a root-relative public marketplace URL with the active country.
 * Existing locale prefixes, external URLs, fragments, and app-internal paths
 * are preserved exactly.
 */
export function localizeMarketplaceHref(href: string, country: string): string {
  if (
    !href.startsWith("/") ||
    isExternalHref(href) ||
    isInternalHref(href) ||
    countryFromPathname(href)
  ) {
    return href;
  }

  const normalizedCountry = normalizeCountry(country);
  if (href === "/") return `/${normalizedCountry}`;
  if (href.startsWith("/?") || href.startsWith("/#")) {
    return `/${normalizedCountry}${href.slice(1)}`;
  }
  return `/${normalizedCountry}${href}`;
}

/**
 * Move a public marketplace URL to another country while preserving its path,
 * query, and fragment. Used by the region switcher so the selected cookie is
 * not immediately overwritten by the old locale segment on reload.
 */
export function switchMarketplaceCountry(
  href: string,
  country: string,
): string {
  if (!href.startsWith("/") || isExternalHref(href) || isInternalHref(href)) {
    return href;
  }

  const normalizedCountry = normalizeCountry(country);
  const currentCountry = countryFromPathname(href);
  if (currentCountry) {
    return href.replace(/^\/[a-z]{2}(?=\/|[?#]|$)/i, `/${normalizedCountry}`);
  }

  return localizeMarketplaceHref(href, normalizedCountry);
}
