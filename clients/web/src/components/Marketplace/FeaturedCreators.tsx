"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import Link from "./LocaleLink";
import { schemas } from "@/lib/api";
import { SectionDivider } from "@/design";
import { useCurrencyControls } from "./CurrencyProvider";

type Organization = schemas["Organization"];

interface FeaturedCreatorsProps {
  creators: Organization[];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

const creatorMeta = (creator: Organization): string => {
  const value = creator as unknown as {
    products_count?: number;
    total_orders?: number;
  };
  const parts: string[] = [];
  if ((value.products_count ?? 0) > 0) {
    parts.push(
      `${value.products_count} ${value.products_count === 1 ? "product" : "products"}`,
    );
  }
  if ((value.total_orders ?? 0) > 0) {
    parts.push(`${value.total_orders?.toLocaleString()} sold`);
  }
  return parts.join(" · ");
};

/** Compact people index: distinct from both product and subscription cards. */
export const FeaturedCreators = ({ creators }: FeaturedCreatorsProps) => {
  const router = useRouter();
  const { country } = useCurrencyControls();

  if (!creators?.length) return null;

  return (
    <SectionDivider
      tone="default"
      density="lg"
      containerClassName="px-4 sm:px-6 md:px-8 lg:px-16"
    >
      <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
        <div>
          <h2 className="font-display text-[clamp(30px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text-primary)]">
            Creators to know
          </h2>
          <p className="mt-3 max-w-[48ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)] sm:text-[15px]">
            Browse shops, catalogues, and the people behind the work.
          </p>
        </div>
        <Link
          href="/creators"
          className="hidden shrink-0 whitespace-nowrap font-sans text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] sm:block"
        >
          All creators →
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-x-7 sm:grid-cols-2 lg:grid-cols-3">
        {creators.slice(0, 6).map((creator) => {
          const value = creator as any;
          const slug = value.slug ?? creator.id;
          const isSeed = creator.id.startsWith("seed_");
          const profileHref = isSeed ? "/creators" : `/creators/${slug}`;
          const avatar = value.avatar_url as string | undefined;
          const bio = (value.bio ?? "") as string;
          const meta = creatorMeta(creator);
          const canTip = value.tipping_enabled === true && !isSeed;

          return (
            <article
              key={creator.id}
              className="relative min-w-0 border-t border-[var(--border)]"
            >
              <Link
                href={profileHref}
                className="group grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-4 py-5 pr-11"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={`${creator.name} avatar`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-[20px] font-semibold text-[var(--text-secondary)]">
                      {initials(creator.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-display text-[18px] font-semibold leading-[1.3] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                    {creator.name}
                  </h3>
                  {bio && (
                    <p className="mt-1 line-clamp-2 font-sans text-[13px] leading-[1.5] text-[var(--text-muted)]">
                      {bio}
                    </p>
                  )}
                  {meta && (
                    <p className="mt-2 font-sans text-[12px] tabular-nums text-[var(--text-secondary)]">
                      {meta}
                    </p>
                  )}
                </div>
              </Link>

              {canTip && (
                <button
                  type="button"
                  aria-label={`Tip ${creator.name}`}
                  data-testid="marketplace-creator-tip"
                  onClick={() => router.push(`/${country}/donation/${slug}`)}
                  className="absolute right-0 top-5 inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--accent)] hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <FiHeart size={17} aria-hidden="true" />
                </button>
              )}
            </article>
          );
        })}
      </div>

      <Link
        href="/creators"
        className="mt-7 inline-flex h-11 items-center whitespace-nowrap rounded-md border border-[var(--border-strong)] px-5 font-sans text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] sm:hidden"
      >
        All creators →
      </Link>
    </SectionDivider>
  );
};
