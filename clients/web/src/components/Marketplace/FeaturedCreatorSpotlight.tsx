import Link from 'next/link'
import { schemas } from '@/lib/api'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { Eyebrow, SectionDivider, typography } from '@/design'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Organization = schemas['Organization']

interface FeaturedCreatorSpotlightProps {
  creator: Organization
  /** Optional top product to feature beneath the bio */
  topProduct?: schemas['Product']
}

/**
 * FeaturedCreatorSpotlight — single large editorial card at top of /creators.
 *
 * Per plan §6.3 step 3. Full-width hero image with their work, bio, top
 * product, "View storefront" CTA. Edited in dashboard via
 * `is_featured_spotlight` flag.
 *
 * Layout: 12-column grid; image takes 7 columns on desktop, copy takes 5.
 * Mobile stacks vertically.
 */
export const FeaturedCreatorSpotlight = ({
  creator,
  topProduct,
}: FeaturedCreatorSpotlightProps) => {
  const banner =
    (creator as any).profile_settings?.cover_image_url ??
    (creator as any).avatar_url
  const avatar = (creator as any).avatar_url
  const slug = (creator as any).slug ?? creator.id
  const bio = ((creator as any).bio ?? '').slice(0, 240)
  const city = ((creator as any).city ?? 'Nairobi') as string
  const topProductImage = topProduct?.medias?.[0]?.public_url

  return (
    <SectionDivider tone="default" density="md">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <Eyebrow>Featured maker</Eyebrow>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Hero image — 7/12 cols on desktop */}
        <div className="lg:col-span-7">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-[var(--surface-sunken)]">
            <OptimizedImage
              src={banner}
              alt={`${creator.name} — featured creator`}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="rounded-md"
              priority
            />
            {/* Subtle warm overlay so the avatar pop reads */}
            <div className="pointer-events-none absolute inset-0 bg-[rgba(26,26,23,0.06)] mix-blend-multiply" />
          </div>
        </div>

        {/* Copy column — 5/12 */}
        <div className="flex flex-col gap-6 lg:col-span-5 lg:py-2">
          {/* Avatar + name + city */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
              <OptimizedImage
                src={avatar}
                alt={`${creator.name} avatar`}
                fill
                sizes="64px"
                className="rounded-full"
              />
            </div>
            <div className="min-w-0">
              <h2
                className={cn(
                  typography.h3,
                  'text-[var(--text-primary)]',
                )}
              >
                {creator.name}
              </h2>
              <p className="font-sans text-[13px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {city}
              </p>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <p
              className={cn(
                'max-w-[44ch] font-sans text-[17px] leading-[1.55] text-[var(--text-secondary)]',
              )}
            >
              {bio}
            </p>
          )}

          {/* Top product preview */}
          {topProduct && (
            <Link
              href={`/product/${topProduct.id}`}
              prefetch
              className="group flex items-center gap-4 rounded-md bg-[var(--surface-sunken)] p-3 transition-colors hover:bg-[var(--surface)]"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--surface)]">
                <OptimizedImage
                  src={topProductImage}
                  alt={`${topProduct.name} cover`}
                  fill
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Top product
                </p>
                <p
                  className={cn(
                    'truncate font-display text-[16px] font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]',
                  )}
                >
                  {topProduct.name}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
              />
            </Link>
          )}

          {/* CTA */}
          <div className="mt-auto pt-2">
            <Link
              href={`/creators/${slug}`}
              className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              View storefront
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </SectionDivider>
  )
}
