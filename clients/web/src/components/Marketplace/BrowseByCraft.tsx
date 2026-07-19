import Image from "next/image";
import Link from "./LocaleLink";
import { FiArrowRight } from "react-icons/fi";
import { SectionDivider } from "@/design";

export interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  cover_image_url?: string | null;
  product_count?: number;
}

interface BrowseByCraftProps {
  categories: CategoryTile[];
}

/** Scan-first category index for the homepage ecosystem. */
export const BrowseByCraft = ({ categories }: BrowseByCraftProps) => {
  if (!categories?.length) return null;

  return (
    <SectionDivider
      tone="sunken"
      density="md"
      containerClassName="px-4 sm:px-6 md:px-8 lg:px-16"
    >
      <div className="mb-7 flex items-end justify-between gap-5 sm:mb-9">
        <div>
          <h2 className="font-display text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text-primary)]">
            Browse by category
          </h2>
          <p className="mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)] sm:text-[15px]">
            Start with the kind of work you need.
          </p>
        </div>
        <Link
          href="/categories"
          className="hidden shrink-0 whitespace-nowrap font-sans text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] sm:block"
        >
          All categories →
        </Link>
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 8).map((category, index) => (
          <li key={category.id} className="min-w-0">
            <Link
              href={`/category/${category.slug}`}
              className="group grid min-h-[96px] min-w-0 grid-cols-[minmax(0,1fr)_56px] items-center gap-4 border-t border-[var(--border)] py-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 shrink-0 font-sans text-[11px] tabular-nums text-[var(--text-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words font-display text-[20px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                    {category.name}
                  </h3>
                  {typeof category.product_count === "number" && (
                    <p className="mt-1 font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
                      {category.product_count}{" "}
                      {category.product_count === 1 ? "item" : "items"}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-[var(--surface-elevated)]">
                {category.cover_image_url ? (
                  <Image
                    src={category.cover_image_url}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <FiArrowRight
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                  />
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/categories"
        className="mt-7 inline-flex h-11 items-center whitespace-nowrap rounded-md border border-[var(--border-strong)] px-5 font-sans text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--background)] sm:hidden"
      >
        All categories →
      </Link>
    </SectionDivider>
  );
};
