import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { COUNTRY_COOKIE, COUNTRY_SOURCE_COOKIE } from "./index";
import { resolveGeo } from "./middleware";

const request = (
  headers: Record<string, string> = {},
  url = "https://blyss.co.ke/",
) => new NextRequest(url, { headers });

describe("resolveGeo", () => {
  it("keeps a country explicitly selected in the switcher ahead of geo", () => {
    const nextRequest = request({
      "cf-ipcountry": "US",
      referer: "https://blyss.co.ke/gb/marketplace",
    });
    nextRequest.cookies.set(COUNTRY_COOKIE, "ke");
    nextRequest.cookies.set(COUNTRY_SOURCE_COOKIE, "user");

    expect(resolveGeo(nextRequest)).toEqual({
      country: "ke",
      currency: "kes",
      source: "user",
      shouldSetCookie: false,
    });
  });

  it("keeps the locale from a same-origin referring marketplace page", () => {
    const nextRequest = request(
      {
        "cf-ipcountry": "US",
        referer: "https://blyss.co.ke/ke/marketplace?sort=trending",
      },
      "https://blyss.co.ke/product/prod_123",
    );

    expect(resolveGeo(nextRequest)).toMatchObject({
      country: "ke",
      currency: "kes",
      source: "referrer",
    });
  });

  it("ignores locale-looking paths from external referrers", () => {
    const nextRequest = request({
      "cf-ipcountry": "US",
      referer: "https://example.com/ke/marketplace",
    });

    expect(resolveGeo(nextRequest).source).toBe("cloudflare");
    expect(resolveGeo(nextRequest).country).toBe("us");
  });

  it("uses the Cloudflare visitor country delivered through the tunnel", () => {
    expect(resolveGeo(request({ "cf-ipcountry": "KE" }))).toMatchObject({
      country: "ke",
      currency: "kes",
      source: "cloudflare",
    });
    expect(resolveGeo(request({ "cf-ipcountry": "DE" }))).toMatchObject({
      country: "de",
      currency: "eur",
      source: "cloudflare",
    });
  });

  it("lets current Cloudflare geo correct a stale legacy US cookie", () => {
    const nextRequest = request({ "cf-ipcountry": "KE" });
    nextRequest.cookies.set(COUNTRY_COOKIE, "us");

    expect(resolveGeo(nextRequest)).toMatchObject({
      country: "ke",
      currency: "kes",
      source: "cloudflare",
    });
  });

  it("uses a regional Accept-Language tag when edge geo is unavailable", () => {
    const nextRequest = request({
      "accept-language": "sw-KE,sw;q=0.9,en-GB;q=0.7,en;q=0.6",
    });

    expect(resolveGeo(nextRequest)).toMatchObject({
      country: "ke",
      currency: "kes",
      source: "language",
    });
  });

  it("honors quality values in Accept-Language", () => {
    const nextRequest = request({
      "accept-language": "en-US;q=0.4,en-GB;q=0.9,en;q=0.8",
    });

    expect(resolveGeo(nextRequest)).toMatchObject({
      country: "gb",
      currency: "gbp",
      source: "language",
    });
  });

  it("ignores Cloudflare XX and language-only tags", () => {
    expect(
      resolveGeo(
        request({ "cf-ipcountry": "XX", "accept-language": "en,sw;q=0.8" }),
      ),
    ).toEqual({
      country: "ke",
      currency: "kes",
      source: "default",
      shouldSetCookie: true,
    });
  });

  it("uses a legacy cookie only when no current request signal exists", () => {
    const nextRequest = request();
    nextRequest.cookies.set(COUNTRY_COOKIE, "za");

    expect(resolveGeo(nextRequest)).toMatchObject({
      country: "za",
      currency: "zar",
      source: "legacy-cookie",
    });
  });

  it("defaults to Kenya rather than the Oracle host location", () => {
    expect(resolveGeo(request())).toEqual({
      country: "ke",
      currency: "kes",
      source: "default",
      shouldSetCookie: true,
    });
  });
});
