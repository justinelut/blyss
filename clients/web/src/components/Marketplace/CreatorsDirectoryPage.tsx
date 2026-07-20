"use client";

"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { schemas } from "@/lib/api";
import { CreatorsHero } from "@/components/Marketplace/CreatorsHero";
import { FeaturedCreatorSpotlight } from "@/components/Marketplace/FeaturedCreatorSpotlight";
import { CreatorsGrid } from "@/components/Marketplace/CreatorsGrid";
import {
  StartStatsStrip,
  type StartStats,
} from "@/components/Start/StartStatsStrip";
import { Eyebrow, typography } from "@/design";
import { cn } from "@/lib/utils";

interface CreatorCategoryOption {
  id: string;
  slug: string;
  name: string;
  display_order: number;
}

interface CreatorsDirectoryPageProps {
  /** Server-rendered initial creator list */
  initialCreators: schemas["Organization"][];
  /** The featured-spotlight creator (from is_featured_spotlight flag) */
  featuredSpotlight?: schemas["Organization"] | null;
  /** Top product from the spotlight creator */
  spotlightTopProduct?: schemas["Product"] | null;
  /** Marketplace-wide stats (creators count, total paid out, etc.).
   *  Same data source as the homepage hero + /start strip. */
  stats?: StartStats | null;
  /** Server-fetched filter options; an empty array is a valid result. */
  initialCategories: CreatorCategoryOption[];
}

/**
 * CreatorsDirectoryPage — client wrapper for /creators.
 *
 * Per plan §6.3:
 * - Hero with eyebrow + headline + filter strip (URL state via the native History API)
 * - Featured spotlight (1 large editorial card) — full bleed below hero
 * - Creator grid (12 cards 3×4)
 *
 * Categories are backoffice-managed and fetched from /v1/creator-categories.
 * Filtering matches a creator's real `creator_category` slug. The "All" tab is
 * a UI-only value handled here.
 */
export function CreatorsDirectoryPage({
  initialCreators,
  featuredSpotlight,
  spotlightTopProduct,
  stats = null,
  initialCategories,
}: CreatorsDirectoryPageProps) {
  const categories = initialCategories;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The categories already arrived with the server response. Keep the filter
  // in the URL without a route fetch; Next.js 16 synchronizes native history
  // updates with useSearchParams.
  const activeRaw = searchParams.get("craft") ?? "all";
  const active =
    activeRaw === "all" || categories.some((c) => c.slug === activeRaw)
      ? activeRaw
      : "all";

  const setActive = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") {
        params.delete("craft");
      } else {
        params.set("craft", next);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname, searchParams],
  );

  const filtered = useMemo(() => {
    if (active === "all") return initialCreators;
    return initialCreators.filter(
      (c: any) => (c.creator_category ?? null) === active,
    );
  }, [initialCreators, active]);

  const activeLabel = categories.find((c) => c.slug === active)?.name ?? active;

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      <CreatorsHero
        active={active}
        onChange={(next) => setActive(next)}
        total={filtered.length}
        categories={categories}
      />

      {/* Marketplace stats strip — same source as the homepage hero +
          /start. Sits between the hero and any spotlight so visitors
          who came in via `/creators` directly see proof of life
          (creators count, paid-out total) without scrolling. Hides
          itself when totals are zero, so a fresh deploy doesn't
          advertise '0 creators'. */}
      <StartStatsStrip stats={stats} />

      {/* Featured spotlight — only when one is provided + we're on All */}
      {featuredSpotlight && active === "all" && (
        <FeaturedCreatorSpotlight
          creator={featuredSpotlight}
          topProduct={spotlightTopProduct ?? undefined}
        />
      )}

      {/* Grid section */}
      <section className="bg-[var(--background)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
          {filtered.length > 0 ? (
            <>
              {active !== "all" && (
                <div className="mb-8">
                  <Eyebrow>{activeLabel}</Eyebrow>
                  <h2
                    className={cn(
                      typography.h2,
                      "mt-3 text-[var(--text-primary)]",
                    )}
                  >
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "maker" : "makers"}
                  </h2>
                </div>
              )}
              <CreatorsGrid creators={filtered} />
            </>
          ) : (
            <div className="flex max-w-[44ch] flex-col items-start py-12">
              <h2 className={cn(typography.h3, "text-[var(--text-primary)]")}>
                No creators in that craft yet.
              </h2>
              <p
                className={cn(
                  typography.body,
                  "mt-4 text-[var(--text-secondary)]",
                )}
              >
                The roster is growing weekly. Try a different craft above, or
                browse all makers.
              </p>
              <button
                type="button"
                onClick={() => setActive("all")}
                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                See all makers
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
