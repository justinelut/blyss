"use client";

/* Hallmark · macrostructure: Catalogue · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Page header · Filter rail (sticky 240px) · Search row · Active
 *           chips · Result count · Grid (4-col 4:5 cards) · Mobile sheet
 * nav: N5 floating-pill (inherited from MarketplaceShell)
 * footer: Ft5 statement (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 9, 24, 26, 36, 51–55, 66)
 *
 * Reference DNA: SSENSE catalog — editorial-first home, type-led filter rail,
 * hairline rules, count right-flushed. Currency selection lives in the
 * header CountrySwitcher (via CurrencyProvider) — not duplicated in the
 * filter rail. Geo currency drives the hard product filter (no FX
 * conversion); rail price input shows the active currency code as a label.
 */

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { schemas } from "@/lib/api";
import { usePublicProducts } from "@/hooks/queries/public-products";
import type {
  BrowseFilters,
  FilterCategory,
} from "@/components/Marketplace/BrowseFilterRail";
import { BrowseGrid } from "@/components/Marketplace/BrowseGrid";
import { BrowseSearchBar } from "@/components/Marketplace/BrowseSearchBar";
import { BrowseEmptyState } from "@/components/Marketplace/BrowseEmptyState";
import { BrowseActiveChips } from "@/components/Marketplace/BrowseActiveChips";
import { BrowseMobileFiltersTrigger } from "@/components/Marketplace/BrowseMobileFiltersTrigger";

const BrowseFilterRail = dynamic(() =>
  import("@/components/Marketplace/BrowseFilterRail").then(
    (module) => module.BrowseFilterRail,
  ),
);
const BrowseMobileFilters = dynamic(() =>
  import("@/components/Marketplace/BrowseMobileFilters").then(
    (module) => module.BrowseMobileFilters,
  ),
);

interface BrowsePageProps {
  initialProducts: schemas["Product"][];
  initialTotalCount: number;
  categories: FilterCategory[];
  initialFilters: {
    search: string | null;
    category: string | null;
    min_price: number | null;
    max_price: number | null;
    type: BrowseFilters["type"];
    currency: BrowseFilters["currency"];
    sort: BrowseFilters["sort"];
    page: number;
  };
}

const productTypes = new Set<BrowseFilters["type"]>([
  "all",
  "one_time",
  "subscription",
]);
const sortValues = new Set<BrowseFilters["sort"]>([
  "newest",
  "trending",
  "price_asc",
  "price_desc",
]);

const parseInteger = (value: string | null) => {
  if (value === null || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * BrowsePage — client wrapper for /marketplace.
 *
 * Owns filter state through the native History API (URL-driven). Hydrates from server-rendered
 * initialProducts on first load; subsequent filter changes refetch via
 * TanStack Query. Filter changes update useSearchParams without a route fetch.
 *
 * Per plan §6.2:
 * - Two-column layout on desktop (240px filter rail + grid)
 * - Single column on mobile with bottom-sheet filters
 * - URL state via Next.js native history integration
 * - Sticky search bar at top of right column
 * - Chip row showing active filters with X to remove each
 */
export function BrowsePage({
  initialProducts,
  initialTotalCount,
  categories,
  initialFilters,
}: BrowsePageProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => {
    const type = searchParams.get("type") as BrowseFilters["type"] | null;
    const sort = searchParams.get("sort") as BrowseFilters["sort"] | null;
    return {
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      min_price: parseInteger(searchParams.get("min_price")),
      max_price: parseInteger(searchParams.get("max_price")),
      type: type && productTypes.has(type) ? type : "all",
      currency: searchParams.get("currency"),
      sort: sort && sortValues.has(sort) ? sort : "newest",
      page: Math.max(1, parseInteger(searchParams.get("page")) ?? 1),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (
      next: Record<string, string | number | null | undefined>,
      options?: { history?: "push" | "replace" },
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        const isDefault =
          (key === "type" && value === "all") ||
          (key === "sort" && value === "newest") ||
          (key === "page" && value === 1) ||
          (key === "currency" && value === initialFilters.currency);
        if (value == null || value === "" || isDefault) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      window.history[
        options?.history === "replace" ? "replaceState" : "pushState"
      ](null, "", query ? `${pathname}?${query}` : pathname);
    },
    [initialFilters.currency, pathname, searchParams],
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const updateViewport = () => setIsDesktop(query.matches);
    updateViewport();
    query.addEventListener("change", updateViewport);
    return () => query.removeEventListener("change", updateViewport);
  }, []);

  const browseFilters: BrowseFilters = useMemo(
    () => ({
      category: filters.category,
      min_price: filters.min_price,
      max_price: filters.max_price,
      type: filters.type,
      currency: filters.currency || initialFilters.currency,
      sort: filters.sort,
    }),
    [filters],
  );

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.category) n++;
    if (filters.type !== "all") n++;
    if (filters.min_price != null || filters.max_price != null) n++;
    if (filters.sort !== "newest") n++;
    if (filters.search) n++;
    return n;
  }, [filters]);

  // Fetch products via TanStack Query — hydrated by initialProducts on first render
  const { data, isLoading, isFetching } = usePublicProducts(
    {
      search: filters.search || undefined,
      category: filters.category || undefined,
      minPrice: filters.min_price || undefined,
      maxPrice: filters.max_price || undefined,
      // Map the URL chip → API filter:
      //   'subscription' → is_recurring=true
      //   'one_time'     → is_recurring=false
      //   'all'          → undefined (no filter)
      isRecurring:
        filters.type === "subscription"
          ? true
          : filters.type === "one_time"
            ? false
            : undefined,
      sort:
        filters.sort === "trending"
          ? "newest" // backend doesn't support 'trending' yet — alias to newest
          : filters.sort,
      // Hard currency filter (geo): only products the creator priced in the
      // visitor's currency. No conversion.
      currency:
        filters.currency || initialFilters.currency
          ? String(filters.currency || initialFilters.currency).toLowerCase()
          : undefined,
      page: filters.page,
    },
    {
      // The server already fetched this exact first page. Seed TanStack Query
      // so hydration does not immediately repeat the API request and replace
      // the SSR grid with loading skeletons.
      initialData: {
        items: initialProducts,
        pagination: {
          total_count: initialTotalCount,
          max_page: Math.max(1, Math.ceil(initialTotalCount / 24)),
        },
      },
    },
  );

  // Always coerce to an array — the SSR fallback can pass `undefined`
  // when the API call .catch'd, and TanStack Query's `data` may be
  // undefined on first render. Guarantees `.length` / `.map` calls
  // below don't blow up on an empty marketplace (e.g. when no creator
  // has activated payouts yet — a real user-facing case after the
  // active-subaccount filter shipped).
  const products = (data?.items ??
    initialProducts ??
    []) as schemas["Product"][];
  const totalCount = data?.pagination?.total_count ?? initialTotalCount ?? 0;

  const updateFilters = (
    next: Partial<BrowseFilters & { search: string | null; page: number }>,
  ) => {
    setFilters({ ...next, page: 1 } as any);
  };

  const clearAll = () => {
    setFilters({
      search: null,
      category: null,
      min_price: null,
      max_price: null,
      type: "all",
      // Reset to the geo-resolved currency, not a hardcoded KES.
      currency: initialFilters.currency,
      sort: "newest",
      page: 1,
    });
  };

  const showEmpty = !isLoading && products.length === 0;

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-16 md:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
          {/* Filter rail — desktop only */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              {isDesktop && (
                <BrowseFilterRail
                  filters={browseFilters}
                  categories={categories}
                  onChange={updateFilters}
                  onClear={clearAll}
                  activeCount={activeCount}
                />
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Search row — sticky on the right column, blurred backdrop, so
                the search + mobile-filters trigger are always one tap away as
                buyers scroll the grid (Etsy-style behaviour). Sits below the
                marketplace header (h-20 = 80px) + the hero band; we keep a
                small offset so the sticky band doesn't overlap on mobile. */}
            <div className="sticky top-20 z-20 -mx-6 bg-[var(--background)]/90 px-6 py-3 backdrop-blur-xl md:-mx-16 md:px-16 lg:-mx-0 lg:px-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-0">
              <div className="flex items-center gap-3">
                <BrowseSearchBar
                  value={filters.search ?? ""}
                  onChange={(v) => setFilters({ search: v || null, page: 1 })}
                />
                {/* Mobile filters trigger */}
                <BrowseMobileFiltersTrigger
                  onClick={() => setMobileOpen(true)}
                  activeCount={activeCount}
                  className="lg:hidden"
                />
              </div>
            </div>

            {/* Active filter chips */}
            <BrowseActiveChips
              filters={browseFilters}
              categories={categories}
              onChange={updateFilters}
            />

            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="font-sans text-[13px] text-[var(--text-secondary)]">
                {isLoading
                  ? "Loading…"
                  : `${totalCount.toLocaleString()} ${totalCount === 1 ? "product" : "products"}`}
              </p>
            </div>

            {/* Grid / empty / loading */}
            {showEmpty ? (
              <BrowseEmptyState
                hasFilters={activeCount > 0}
                onClear={activeCount > 0 ? clearAll : undefined}
              />
            ) : (
              <BrowseGrid
                products={products}
                isLoading={isLoading || isFetching}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet is loaded only after the trigger is used. */}
      {mobileOpen && (
        <BrowseMobileFilters
          open
          onOpenChange={setMobileOpen}
          filters={browseFilters}
          categories={categories}
          onChange={updateFilters}
          onClear={clearAll}
          activeCount={activeCount}
        />
      )}
    </div>
  );
}
