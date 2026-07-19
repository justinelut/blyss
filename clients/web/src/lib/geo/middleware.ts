import type { NextRequest } from "next/server";
import {
  COUNTRY_COOKIE,
  COUNTRY_SOURCE_COOKIE,
  DEFAULT_COUNTRY,
  currencyForCountry,
  isSupportedCountry,
} from "./index";
import { countryFromPathname } from "./path";

export type GeoSource =
  | "user"
  | "referrer"
  | "cloudflare"
  | "vercel"
  | "language"
  | "legacy-cookie"
  | "default";

export interface ResolvedGeo {
  country: string;
  currency: string;
  source: GeoSource;
  /** Whether Proxy should (re)write the readable country cookie. */
  shouldSetCookie: boolean;
}

const countryFromSameOriginReferrer = (request: NextRequest): string | null => {
  const referrer = request.headers.get("referer");
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    if (url.origin !== request.nextUrl.origin) return null;
    return countryFromPathname(url.pathname);
  } catch {
    return null;
  }
};

const countryFromHeader = (value: string | null): string | null => {
  const country = value?.trim().toLowerCase() ?? "";
  // Cloudflare uses XX when a country cannot be determined. It is not a
  // storefront region and must fall through to browser language/default.
  if (country === "xx" || !isSupportedCountry(country)) return null;
  return country;
};

/**
 * Use the browser's regional language tag only as an infrastructure fallback.
 * This reads the incoming request, not the Oracle host locale. A language-only
 * tag such as `en` is intentionally ignored because it does not identify a
 * country.
 */
const countryFromAcceptLanguage = (value: string | null): string | null => {
  if (!value) return null;

  const preferences = value
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...params] = entry.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of preferences) {
    const parts = tag.split("-");
    const region = parts.slice(1).find((part) => /^[a-z]{2}$/i.test(part));
    if (region && isSupportedCountry(region)) return region.toLowerCase();
  }

  return null;
};

const resolved = (
  country: string,
  source: GeoSource,
  shouldSetCookie: boolean,
): ResolvedGeo => ({
  country,
  currency: currencyForCountry(country),
  source,
  shouldSetCookie,
});

/**
 * Resolve the buyer's country for a self-hosted Next.js deployment behind
 * Cloudflare Tunnel.
 *
 * The Oracle machine's IP, timezone, and locale are never consulted.
 * Precedence for un-prefixed marketplace requests:
 *   1. Cookie explicitly marked by the country switcher as a user choice
 *   2. Locale on a same-origin referring page (protects old raw links)
 *   3. Cloudflare's visitor-country header from the tunnel
 *   4. Vercel's header for preview environments only
 *   5. Browser regional Accept-Language tag
 *   6. Legacy country cookie (old cookies have no source marker)
 *   7. Kenya, the safe default for the blyss.co.ke storefront
 *
 * URL-prefixed requests are resolved before this function in proxy.ts, so an
 * explicit /ke, /us, etc. always remains the highest-priority signal.
 */
export function resolveGeo(request: NextRequest): ResolvedGeo {
  const cookieCountry = request.cookies.get(COUNTRY_COOKIE)?.value;
  const cookieSource = request.cookies.get(COUNTRY_SOURCE_COOKIE)?.value;

  if (cookieSource === "user" && isSupportedCountry(cookieCountry)) {
    return resolved(cookieCountry!.toLowerCase(), "user", false);
  }

  const referrerCountry = countryFromSameOriginReferrer(request);
  if (referrerCountry) {
    return resolved(referrerCountry, "referrer", true);
  }

  const cloudflareCountry = countryFromHeader(
    request.headers.get("cf-ipcountry"),
  );
  if (cloudflareCountry) {
    return resolved(cloudflareCountry, "cloudflare", true);
  }

  const vercelCountry = countryFromHeader(
    request.headers.get("x-vercel-ip-country"),
  );
  if (vercelCountry) {
    return resolved(vercelCountry, "vercel", true);
  }

  const languageCountry = countryFromAcceptLanguage(
    request.headers.get("accept-language"),
  );
  if (languageCountry) {
    return resolved(languageCountry, "language", true);
  }

  // Existing installations wrote automatic and manual choices into the same
  // cookie. Keep the value only when no current request signal is available;
  // this prevents a stale auto-detected US cookie pinning a Kenyan buyer.
  if (isSupportedCountry(cookieCountry)) {
    return resolved(cookieCountry!.toLowerCase(), "legacy-cookie", true);
  }

  return resolved(DEFAULT_COUNTRY, "default", true);
}
