import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { COUNTRY_COOKIE } from "./index";
import { resolveGeo } from "./middleware";

describe("resolveGeo", () => {
  it("keeps an explicit country cookie ahead of every other signal", () => {
    const request = new NextRequest("https://blyss.co.ke/product/prod_123", {
      headers: {
        "cf-ipcountry": "US",
        referer: "https://blyss.co.ke/gb/marketplace",
      },
    });
    request.cookies.set(COUNTRY_COOKIE, "ke");

    expect(resolveGeo(request)).toEqual({
      country: "ke",
      currency: "kes",
      shouldSetCookie: false,
    });
  });

  it("keeps the locale from a same-origin referring page", () => {
    const request = new NextRequest("https://blyss.co.ke/product/prod_123", {
      headers: {
        "cf-ipcountry": "US",
        referer: "https://blyss.co.ke/ke/marketplace?sort=trending",
      },
    });

    expect(resolveGeo(request)).toEqual({
      country: "ke",
      currency: "kes",
      shouldSetCookie: true,
    });
  });

  it("ignores a locale supplied by an external referrer", () => {
    const request = new NextRequest("https://blyss.co.ke/product/prod_123", {
      headers: {
        "cf-ipcountry": "US",
        referer: "https://example.com/ke/marketplace",
      },
    });

    expect(resolveGeo(request).country).toBe("us");
  });

  it("uses edge geolocation and then the US fallback", () => {
    const kenyaRequest = new NextRequest("https://blyss.co.ke/");
    kenyaRequest.headers.set("cf-ipcountry", "KE");
    expect(resolveGeo(kenyaRequest)).toMatchObject({
      country: "ke",
      currency: "kes",
    });

    const unknownRequest = new NextRequest("https://blyss.co.ke/");
    expect(resolveGeo(unknownRequest)).toEqual({
      country: "us",
      currency: "usd",
      shouldSetCookie: true,
    });
  });
});
