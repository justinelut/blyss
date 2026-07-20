"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import {
  BrowseFilterRail,
  type BrowseFilters,
  type FilterCategory,
} from "./BrowseFilterRail";

interface BrowseMobileFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BrowseFilters;
  categories: FilterCategory[];
  onChange: (next: Partial<BrowseFilters>) => void;
  onClear: () => void;
  activeCount: number;
}

/**
 * BrowseMobileFilters — full-height bottom sheet for filter controls on
 * mobile/tablet viewports.
 *
 * Per plan §6.2: triggered by the Filters button + chip row. Slides up from
 * bottom of viewport, full-height with header + filter rail + sticky apply
 * button at bottom.
 */
export const BrowseMobileFilters = ({
  open,
  onOpenChange,
  filters,
  categories,
  onChange,
  onClear,
  activeCount,
}: BrowseMobileFiltersProps) => {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-[rgba(15,14,12,0.5)] lg:hidden"
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-[var(--background)] lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Filter content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <BrowseFilterRail
                filters={filters}
                categories={categories}
                onChange={onChange}
                onClear={onClear}
                activeCount={activeCount}
              />
            </div>

            {/* Sticky apply bar */}
            <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--accent)] font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Show results
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
