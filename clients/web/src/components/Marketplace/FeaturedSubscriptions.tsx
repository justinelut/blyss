"use client";

import Image from "next/image";
import Link from "./LocaleLink";
import { schemas } from "@/lib/api";
import { SectionDivider } from "@/design";
import { getFallbackPrice } from "@/lib/currency/marketplace";
import { useDisplayCurrency } from "./CurrencyProvider";

type Product = schemas["Product"];

interface FeaturedSubscriptionsProps {
  subscriptions: Product[];
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

const cadence = (product: Product): string => {
  const interval = (product as any).recurring_interval ?? "month";
  const count = (product as any).recurring_interval_count ?? 1;
  const unit = interval === "year" ? "year" : "month";
  return count === 1 ? `/ ${unit}` : `/ ${count} ${unit}s`;
};

/** Compact recurring-access index, visually distinct from product galleries. */
export const FeaturedSubscriptions = ({
  subscriptions,
}: FeaturedSubscriptionsProps) => {
  const currency = useDisplayCurrency();
  if (!subscriptions?.length) return null;

  return (
    <SectionDivider
      tone="sunken"
      density="lg"
      containerClassName="px-4 sm:px-6 md:px-8 lg:px-16"
    >
      <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
        <div>
          <h2 className="font-display text-[clamp(30px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text-primary)]">
            Ongoing access
          </h2>
          <p className="mt-3 max-w-[48ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)] sm:text-[15px]">
            Memberships, new releases, and recurring work from creators.
          </p>
        </div>
        <Link
          href="/marketplace?type=subscription"
          className="hidden shrink-0 whitespace-nowrap font-sans text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] sm:block"
        >
          All subscriptions →
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-x-7 lg:grid-cols-3">
        {subscriptions.slice(0, 6).map((product) => {
          const creator = (product as any).organization?.name as
            | string
            | undefined;
          const image = product.medias?.[0]?.public_url;
          const isSeed = product.id.startsWith("seed_");
          const href = isSeed
            ? "/marketplace?type=subscription"
            : `/product/${product.id}`;
          const price = formatPrice(product, currency);

          return (
            <Link
              key={product.id}
              href={href}
              className="group grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-4 border-t border-[var(--border)] py-5"
              aria-label={`${product.name}${creator ? ` by ${creator}` : ""}`}
            >
              <div className="relative aspect-square h-[72px] overflow-hidden rounded-md bg-[var(--surface-elevated)]">
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-[28px] font-semibold text-[var(--text-muted)]">
                    {(product.name[0] ?? "·").toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="break-words font-display text-[17px] font-semibold leading-[1.3] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                  {product.name}
                </h3>
                {creator && (
                  <p className="mt-1 font-sans text-[12px] text-[var(--text-muted)]">
                    by {creator}
                  </p>
                )}
                {price && (
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 font-display text-[17px] font-semibold tabular-nums text-[var(--text-primary)]">
                    <span>{price}</span>
                    <span className="font-sans text-[12px] font-normal text-[var(--text-muted)]">
                      {cadence(product)}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/marketplace?type=subscription"
        className="mt-7 inline-flex h-11 items-center whitespace-nowrap rounded-md border border-[var(--border-strong)] px-5 font-sans text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--background)] sm:hidden"
      >
        All subscriptions →
      </Link>
    </SectionDivider>
  );
};
