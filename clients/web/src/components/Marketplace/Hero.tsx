"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiSearch } from "react-icons/fi";
import { schemas } from "@/lib/api";
import { getFallbackPrice } from "@/lib/currency/marketplace";
import { cn } from "@/lib/utils";
import { localizeMarketplaceHref } from "@/lib/geo/path";

type Product = schemas["Product"];

interface HeroProps {
  featuredProduct?: Product;
  country: string;
  currency: string;
}

const formatPrice = (product: Product, currency: string): string => {
  const resolved = getFallbackPrice(product, currency);
  if (!resolved) return "";
  const amount =
    (((resolved.price as any).price_amount ??
      (resolved.price as any).preset_amount ??
      0) as number) / 100;
  const code = resolved.currency.toUpperCase();
  if (code === "KES") return `KSh ${amount.toLocaleString("en-KE")}`;
  if (code === "USD") return `US$ ${amount.toLocaleString("en-US")}`;
  return `${code} ${amount.toLocaleString()}`;
};

export const Hero = ({ featuredProduct, country, currency }: HeroProps) => {
  const localizedHref = (href: string) =>
    localizeMarketplaceHref(href, country);
  const image = featuredProduct?.medias?.[0]?.public_url;
  const creator = (featuredProduct as any)?.organization?.name as
    | string
    | undefined;
  const isSeed = featuredProduct?.id.startsWith("seed_") ?? false;
  const productHref = featuredProduct
    ? isSeed
      ? "/marketplace"
      : `/product/${featuredProduct.id}`
    : "/marketplace";
  const price = featuredProduct ? formatPrice(featuredProduct, currency) : "";

  return (
    <section
      className="bg-[var(--background)] text-[var(--text-primary)]"
      aria-labelledby="home-marketplace-heading"
    >
      <div
        className={cn(
          "mx-auto grid max-w-[1280px] min-w-0 grid-cols-1 gap-9 px-4 py-10 sm:px-6 sm:py-12 md:px-8 md:py-14 lg:px-16 lg:py-20",
          featuredProduct &&
            "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-10 lg:gap-16",
        )}
      >
        <div className="min-w-0">
          <h1
            id="home-marketplace-heading"
            className="max-w-[12ch] break-words pb-2 font-display text-[clamp(42px,6vw,72px)] font-semibold leading-[1.06] tracking-[-0.035em]"
          >
            What are you looking for?
          </h1>
          <p className="mt-5 max-w-[48ch] font-sans text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[18px]">
            Search digital products and ongoing subscriptions from independent
            creators. Prices and checkout options follow your selected region.
          </p>

          <form
            action={`/${country}/search`}
            method="get"
            role="search"
            className="mt-7 flex min-w-0 items-center gap-2 rounded-md bg-[var(--surface-sunken)] p-1.5"
          >
            <label htmlFor="homepage-search" className="sr-only">
              Search products and creators
            </label>
            <input
              id="homepage-search"
              name="q"
              type="search"
              enterKeyHint="search"
              placeholder="Search templates, ebooks, beats…"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 font-sans text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[var(--action)] px-3.5 font-sans text-[14px] font-medium text-[var(--action-foreground)] hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:px-5"
            >
              <FiSearch size={17} aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              <span className="sr-only sm:hidden">Search</span>
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={localizedHref("/marketplace")}
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap font-sans text-[14px] font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--accent)]"
            >
              Browse all products
              <FiArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href={localizedHref("/creators")}
              className="inline-flex h-11 items-center whitespace-nowrap font-sans text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              Explore creators
            </Link>
          </div>
        </div>

        {featuredProduct && (
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Featured today
              </p>
              <Link
                href={localizedHref(productHref)}
                className="whitespace-nowrap font-sans text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                View product →
              </Link>
            </div>

            <Link
              href={localizedHref(productHref)}
              className="group block min-w-0"
            >
              <div className="relative aspect-[16/10] min-w-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                {image ? (
                  <Image
                    src={image}
                    alt={`${featuredProduct.name} product cover`}
                    fill
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) 54vw, 52vw"
                    className="object-contain transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-95"
                  />
                ) : (
                  <div className="flex h-full w-full items-start justify-end p-6">
                    <span className="font-display text-[clamp(48px,8vw,84px)] font-semibold leading-none text-[var(--text-muted)]">
                      {(featuredProduct.name[0] ?? "·").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-2 pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-6">
                <div className="min-w-0">
                  <h2 className="break-words pb-1 font-display text-[20px] font-semibold leading-[1.32] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] sm:text-[22px]">
                    {featuredProduct.name}
                  </h2>
                  {creator && (
                    <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">
                      by {creator}
                    </p>
                  )}
                </div>
                {price && (
                  <p className="shrink-0 font-display text-[18px] font-semibold tabular-nums text-[var(--text-primary)] lg:text-right lg:text-[20px]">
                    {price}
                  </p>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
