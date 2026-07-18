import { describe, expect, it } from "vitest";
import {
  countryFromPathname,
  localizeMarketplaceHref,
  switchMarketplaceCountry,
} from "./path";

describe("marketplace regional paths", () => {
  it("prefixes public marketplace links with the active country", () => {
    expect(localizeMarketplaceHref("/product/prod_123", "ke")).toBe(
      "/ke/product/prod_123",
    );
    expect(localizeMarketplaceHref("/marketplace?sort=trending", "ke")).toBe(
      "/ke/marketplace?sort=trending",
    );
    expect(localizeMarketplaceHref("/?q=beats", "ke")).toBe("/ke?q=beats");
    expect(localizeMarketplaceHref("/", "ke")).toBe("/ke");
  });

  it("preserves an existing country prefix", () => {
    expect(localizeMarketplaceHref("/ke/product/prod_123", "us")).toBe(
      "/ke/product/prod_123",
    );
  });

  it("does not localize app internals or external destinations", () => {
    expect(localizeMarketplaceHref("/dashboard/shop", "ke")).toBe(
      "/dashboard/shop",
    );
    expect(localizeMarketplaceHref("/checkout/secret", "ke")).toBe(
      "/checkout/secret",
    );
    expect(localizeMarketplaceHref("https://example.com", "ke")).toBe(
      "https://example.com",
    );
    expect(localizeMarketplaceHref("#details", "ke")).toBe("#details");
  });

  it("switches country without losing path, query, or fragment", () => {
    expect(
      switchMarketplaceCountry("/ke/marketplace?category=beats#results", "us"),
    ).toBe("/us/marketplace?category=beats#results");
    expect(switchMarketplaceCountry("/product/prod_123", "ke")).toBe(
      "/ke/product/prod_123",
    );
  });

  it("extracts only valid leading country segments", () => {
    expect(countryFromPathname("/ke/product/prod_123")).toBe("ke");
    expect(countryFromPathname("/US?sort=new")).toBe("us");
    expect(countryFromPathname("/marketplace")).toBeNull();
    expect(countryFromPathname("/ken/product")).toBeNull();
  });
});
