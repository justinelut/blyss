"use client";

/* Buyer-first marketplace opening. Core copy and actions are visible in the
 * prerendered HTML; motion is limited to scroll parallax on the image mosaic. */
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { FiArrowRight } from "react-icons/fi";
import { schemas } from "@/lib/api";

interface HeroProps {
  showcaseProducts?: schemas["Product"][];
  showcaseCreators?: schemas["Organization"][];
  totals?: {
    creators?: number;
    products?: number;
    totalPaidOut?: number;
    totalEarned?: number;
    totalPaidOutCurrency?: string;
  };
}

interface MosaicTile {
  imageUrl: string;
  href: string;
  label: string;
  alt: string;
}

export const Hero = ({
  showcaseProducts = [],
  showcaseCreators = [],
  totals,
}: HeroProps) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : -28],
  );

  const tiles: MosaicTile[] = [];
  for (const product of showcaseProducts) {
    if (tiles.length >= 4) break;
    const imageUrl = product.medias?.[0]?.public_url;
    if (!imageUrl) continue;
    tiles.push({
      imageUrl,
      href: `/product/${product.id}`,
      label: product.name,
      alt: product.name,
    });
  }
  for (const creator of showcaseCreators) {
    if (tiles.length >= 4) break;
    const imageUrl =
      (creator as unknown as { cover_image_url?: string | null })
        .cover_image_url ?? creator.avatar_url;
    if (!imageUrl) continue;
    tiles.push({
      imageUrl,
      href: `/creators/${creator.slug ?? creator.id}`,
      label: creator.name,
      alt: creator.name,
    });
  }

  const paidValue =
    totals?.totalPaidOut && totals.totalPaidOut > 0
      ? totals.totalPaidOut
      : (totals?.totalEarned ?? 0);
  const paidLabel =
    totals?.totalPaidOut && totals.totalPaidOut > 0
      ? "Paid to creators"
      : "Creator earnings";
  const stats = [
    totals?.creators && totals.creators > 0
      ? { value: formatCount(totals.creators), label: "Creators" }
      : null,
    totals?.products && totals.products > 0
      ? { value: formatCount(totals.products), label: "Products" }
      : null,
    paidValue > 0
      ? {
          value: formatMoney(paidValue, totals?.totalPaidOutCurrency ?? "kes"),
          label: paidLabel,
        }
      : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[var(--background)]"
      aria-labelledby="home-marquee-headline"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 pt-10 pb-14 md:px-16 md:pt-12 md:pb-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:pt-14 lg:pb-24">
        <div className="flex min-w-0 flex-col lg:col-span-6">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Digital products · Independent creators
          </p>
          <h1
            id="home-marquee-headline"
            className="mt-5 max-w-[11ch] font-display text-[clamp(46px,6.2vw,82px)] font-semibold leading-[0.98] tracking-[-0.035em] text-[var(--text-primary)]"
          >
            Made in Kenya.{" "}
            <em className="font-display text-[var(--accent)]">
              Useful everywhere.
            </em>
          </h1>

          <p className="mt-7 max-w-[48ch] font-sans text-[17px] leading-[1.6] text-[var(--text-secondary)] md:text-[20px]">
            Shop templates, ebooks, beats, presets, courses, and subscriptions
            from independent creators. See the price for your region and the
            payment methods available at checkout.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/marketplace"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--action)] px-7 font-sans text-[15px] font-medium text-[var(--action-foreground)] transition-colors hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Browse products
              <FiArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/start"
              className="inline-flex h-12 items-center justify-center font-sans text-[14px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Open your shop →
            </Link>
          </div>

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-[580px] grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <StatCell key={stat.label} {...stat} />
              ))}
            </dl>
          )}
        </div>

        <motion.div style={{ y: parallaxY }} className="lg:col-span-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {tiles.length === 0 ? (
              <div className="col-span-2 flex aspect-[16/10] flex-col items-start justify-end overflow-hidden rounded-md bg-[var(--surface-sunken)] p-7 md:p-10">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  The first edition
                </p>
                <p className="mt-3 max-w-[14ch] font-display text-[clamp(28px,4vw,44px)] font-medium leading-[1.05] text-[var(--text-primary)]">
                  The marketplace grows with every shop.
                </p>
                <Link
                  href="/start"
                  className="mt-7 font-sans text-[13px] font-medium text-[var(--accent)] underline underline-offset-4"
                >
                  Open the first one →
                </Link>
              </div>
            ) : (
              tiles.map((tile, index) => (
                <MosaicTile
                  key={`${tile.href}-${index}`}
                  tile={tile}
                  priority={index < 2}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
      <div className="mx-auto h-px max-w-[1280px] bg-[var(--border)]" />
    </section>
  );
};

const MosaicTile = ({
  tile,
  priority,
}: {
  tile: MosaicTile;
  priority: boolean;
}) => (
  <Link
    href={tile.href}
    className="group relative block aspect-[4/5] overflow-hidden rounded-md bg-[var(--surface-sunken)]"
    aria-label={`View ${tile.label}`}
  >
    <Image
      src={tile.imageUrl}
      alt={tile.alt}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 24vw, 50vw"
      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.02]"
    />
    <div className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.03)] mix-blend-multiply" />
    <p className="absolute right-3 bottom-3 left-3 line-clamp-2 bg-[var(--background)] px-2 py-1.5 font-sans text-[11px] font-medium leading-[1.3] text-[var(--text-primary)]">
      {tile.label}
    </p>
  </Link>
);

const StatCell = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col">
    <dt className="order-2 mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">
      {label}
    </dt>
    <dd className="order-1 font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)] md:text-[25px]">
      {value}
    </dd>
  </div>
);

const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const formatMoney = (minor: number, currency: string): string => {
  const major = (minor || 0) / 100;
  const code = (currency || "kes").toUpperCase();
  const symbol = code === "KES" ? "KSh" : code === "USD" ? "US$" : code;
  return `${symbol} ${formatCount(Math.round(major))}`;
};
