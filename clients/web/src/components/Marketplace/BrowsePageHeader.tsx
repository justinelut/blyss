import { CategoryNavigation } from "@/components/Category/CategoryNavigation";
import type { FilterCategory } from "@/components/Marketplace/BrowseFilterRail";
import { Eyebrow, typography } from "@/design";
import { cn } from "@/lib/utils";

export function BrowsePageHeader({
  categories,
}: {
  categories: FilterCategory[];
}) {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
        <Eyebrow accent>The marketplace</Eyebrow>
        <h1
          className={cn(
            typography.h1,
            "mt-4 max-w-[18ch] text-[var(--text-primary)]",
          )}
        >
          Find your next thing.
        </h1>
      </div>
      <div className="mx-auto max-w-[1280px] px-6 pb-6 md:px-16">
        <CategoryNavigation categories={categories} />
      </div>
    </header>
  );
}
