"use client";

import Image from "next/image";
import Link from "./LocaleLink";
import { schemas } from "@/lib/api";
import { getFallbackPrice } from "@/lib/currency/marketplace";
import { cn } from "@/lib/utils";
import { useDisplayCurrency } from "./CurrencyProvider";

type Product = schemas["Product"];

interface HomepageProductCardProps {
  product: Product;
  priority?: boolean;
  className?: string;
}

const formatPrice = (product: Product, preferredCurrency: string): string => {
  const resolved = getFallbackPrice(product, preferredCurrency);
  if (!resolved) return "";
  const amount =
    (((resolved.price as any).price_amount ??
      (resolved.price as any).preset_amount ??
      0) as number) / 100;
  const currency = resolved.currency.toUpperCase();
  if (currency === "KES") return `KSh ${amount.toLocaleString("en-KE")}`;
  if (currency === "USD") return `US$ ${amount.toLocaleString("en-US")}`;
  return `${currency} ${amount.toLocaleString()}`;
};

const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const recurringCadence = (product: Product): string => {
  const interval = (product as any).recurring_interval ?? "month";
  const count = (product as any).recurring_interval_count ?? 1;
  const unit = interval === "year" ? "year" : "month";
  return count === 1 ? `/ ${unit}` : `/ ${count} ${unit}s`;
};

/** a compact editorial row on phones and a quiet gallery
 * card once there is enough width. Titles and buying information live outside
 * the media and are never hidden behind clamps on the opening mobile surface.
 */
export const HomepageProductCard = ({
  product,
  priority = false,
  className,
}: HomepageProductCardProps) => {
  const currency = useDisplayCurrency();
  const image = product.medias?.[0]?.public_url;
  const creator = (product as any).organization?.name as string | undefined;
  const isSeed = product.id.startsWith("seed_");
  const href = isSeed ? "/marketplace" : `/product/${product.id}`;
  const reviewCount = (product as any).review_count ?? 0;
  const reviewAverage = (product as any).review_rating_avg as
    | number
    | undefined;
  const ordersCount = (product as any).orders_count ?? 0;
  const price = formatPrice(product, currency);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group grid min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-4 border-t border-[var(--border)] pt-4",
        "sm:block sm:border-0 sm:pt-0",
        className,
      )}
      aria-label={`${product.name}${creator ? ` by ${creator}` : ""}`}
    >
      <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
        {image ? (
          <Image
            src={image}
            alt={`${product.name} product cover`}
            fill
            priority={priority}
            sizes="(max-width: 639px) 112px, (max-width: 1023px) 44vw, 23vw"
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.015]"
          />
        ) : (
          <div className="flex h-full w-full items-start justify-end p-4 sm:p-5">
            <span className="font-display text-[42px] font-medium leading-none text-[var(--text-muted)] sm:text-[56px]">
              {(creator?.[0] ?? product.name[0] ?? "·").toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 sm:mt-4">
        {product.is_recurring && (
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Subscription
          </p>
        )}
        <h3 className="break-words font-display text-[17px] font-semibold leading-[1.3] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] sm:text-[18px]">
          {product.name}
        </h3>
        {creator && (
          <p className="font-sans text-[13px] leading-[1.45] text-[var(--text-muted)]">
            by {creator}
          </p>
        )}
        {(reviewCount > 0 || ordersCount > 0) && (
          <p className="mt-1 flex flex-wrap gap-x-2 font-sans text-[12px] leading-[1.4] text-[var(--text-secondary)]">
            {reviewCount > 0 && typeof reviewAverage === "number" && (
              <span className="tabular-nums">
                {reviewAverage.toFixed(1)} · {reviewCount}{" "}
                {reviewCount === 1 ? "review" : "reviews"}
              </span>
            )}
            {ordersCount > 0 && (
              <span className="tabular-nums">
                {formatCount(ordersCount)} sold
              </span>
            )}
          </p>
        )}
        {price && (
          <p className="mt-1 font-display text-[17px] font-semibold tabular-nums text-[var(--text-primary)] sm:text-[18px]">
            {price}
            {product.is_recurring && (
              <span className="ml-1 font-sans text-[12px] font-normal text-[var(--text-muted)]">
                {recurringCadence(product)}
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
};
