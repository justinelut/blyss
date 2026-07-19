import Link from "./LocaleLink";
import { schemas } from "@/lib/api";
import { SectionDivider } from "@/design";
import { HomepageProductCard } from "./HomepageProductCard";

interface TrendingProductsProps {
  products: schemas["Product"][];
  heading?: string;
  description?: string;
  viewAllHref?: string;
  tone?: "default" | "sunken" | "elevated";
}

/** A homepage discovery surface, not the canonical marketplace grid. */
export const TrendingProducts = ({
  products,
  heading = "Featured products",
  description = "A selection from independent shops on Blyss.",
  viewAllHref = "/marketplace",
  tone = "default",
}: TrendingProductsProps) => {
  if (!products?.length) return null;

  return (
    <SectionDivider
      tone={tone}
      density="lg"
      containerClassName="px-4 sm:px-6 md:px-8 lg:px-16"
    >
      <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
        <div className="min-w-0">
          <h2 className="font-display text-[clamp(30px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text-primary)]">
            {heading}
          </h2>
          <p className="mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)] sm:text-[15px]">
            {description}
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="hidden shrink-0 whitespace-nowrap font-sans text-[14px] font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline sm:block"
        >
          See all →
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-5 xl:gap-x-6">
        {products.slice(0, 8).map((product, index) => (
          <HomepageProductCard
            key={product.id}
            product={product}
            priority={index < 2}
          />
        ))}
      </div>

      <Link
        href={viewAllHref}
        className="mt-8 inline-flex h-11 items-center whitespace-nowrap rounded-md border border-[var(--border-strong)] px-5 font-sans text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] sm:hidden"
      >
        See all products →
      </Link>
    </SectionDivider>
  );
};
