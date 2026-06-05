'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { schemas } from '@/lib/api'
import { Eyebrow } from '@/design'
import { cn } from '@/lib/utils'

interface HeroProps {
  /** Real products from the backend. The mosaic adapts to whatever's
   *  available — single product, multiple, or none. No fake fallbacks. */
  showcaseProducts?: schemas['Product'][]
  /** Real creators from the backend. Used to fill the right-column mosaic
   *  when products alone aren't enough for 4 tiles, and as the editorial
   *  empty state when there are no products at all. */
  showcaseCreators?: schemas['Organization'][]
}

/**
 * Hero — editorial split-grid homepage opener with cinematic motion.
 *
 * Layout: 7/12 content column on left, 5/12 showcase mosaic on right.
 * Mobile collapses to single column with showcase below.
 *
 * Right column adapts to backend content:
 * - 4+ products → full product mosaic (1 hero tile + 3 secondary)
 * - 1-3 products → product hero tile + creator tiles to fill
 * - 0 products, 1+ creators → editorial creator-feature panel
 * - 0 of everything → minimal editorial typographic block ("Be the first")
 *
 * No hardcoded placeholder content — every visible element is sourced
 * from the backend.
 */
export const Hero = ({
  showcaseProducts = [],
  showcaseCreators = [],
}: HeroProps) => {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80])

  const ease = [0.32, 0.72, 0, 1] as const
  const headlineWords = ['Make.', 'Sell.', 'Get paid.']

  const fadeUp = (delay: number, distance = 16) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: distance },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease, delay },
        }

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[var(--background)]"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 pt-10 pb-16 md:px-16 md:pt-14 md:pb-24 lg:grid-cols-12 lg:gap-16 lg:pt-16 lg:pb-32">
        {/* Left — content column */}
        <motion.div style={{ y: parallaxY }} className="flex flex-col lg:col-span-7">
          <motion.div {...fadeUp(0.05)}>
            <Eyebrow accent>Digital products · Nairobi</Eyebrow>
          </motion.div>

          <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,8vw,112px)] text-[var(--text-primary)]">
            {headlineWords.map((word, i) => {
              const isItalic = i === 1
              return (
                <motion.span
                  key={`${word}-${i}`}
                  {...(reduce
                    ? { initial: false }
                    : {
                        initial: { opacity: 0, y: 32, rotateX: -25 },
                        animate: { opacity: 1, y: 0, rotateX: 0 },
                        transition: { duration: 0.8, ease, delay: 0.15 + i * 0.12 },
                      })}
                  className={cn(
                    'mr-3 inline-block',
                    isItalic && 'font-display italic text-[var(--accent)]',
                  )}
                  style={{ transformOrigin: 'bottom' }}
                >
                  {word}
                </motion.span>
              )
            })}
          </h1>

          <motion.p
            {...fadeUp(0.55)}
            className="mt-8 max-w-[52ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)] md:text-[22px]"
          >
            The modern marketplace for Kenyan creators. Templates, ebooks,
            beats, courses, subscription tiers. Card or mobile money. Paid out
            within 24&nbsp;hours.
          </motion.p>

          {/* CTA cluster */}
          <motion.div {...fadeUp(0.7)} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/start"
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 py-4 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
            >
              Start selling
              <FiArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/marketplace"
              className="group inline-flex h-13 items-center justify-center gap-1.5 px-2 py-4 font-sans text-[15px] font-medium text-[var(--text-primary)] underline-offset-8 transition-colors hover:text-[var(--accent)] hover:underline"
            >
              Browse the marketplace
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div
            {...fadeUp(0.85)}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 font-sans text-[13px] text-[var(--text-muted)]"
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              M-Pesa &amp; card
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              20% platform fee
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              24-hour payouts
            </span>
          </motion.div>
        </motion.div>

        {/* Right — adaptive showcase */}
        <div className="relative lg:col-span-5">
          <ShowcaseRight
            reduce={reduce ?? false}
            ease={ease}
            products={showcaseProducts}
            creators={showcaseCreators}
          />
        </div>
      </div>
    </section>
  )
}

/**
 * ShowcaseRight — adapts to whatever real content is available. Picks one of
 * three modes:
 *
 *   1. Mosaic        — when there are 1+ real products to show
 *   2. CreatorPanel  — when there are 0 products but 1+ creators
 *   3. Editorial     — when both are empty (genuinely brand-new platform)
 */
function ShowcaseRight({
  reduce,
  ease,
  products,
  creators,
}: {
  reduce: boolean
  ease: readonly [number, number, number, number]
  products: schemas['Product'][]
  creators: schemas['Organization'][]
}) {
  if (products.length > 0) {
    return (
      <ShowcaseMosaic
        reduce={reduce}
        ease={ease}
        products={products}
        creators={creators}
      />
    )
  }
  if (creators.length > 0) {
    return <ShowcaseCreatorPanel reduce={reduce} ease={ease} creators={creators} />
  }
  return <ShowcaseEditorial reduce={reduce} ease={ease} />
}

type Tile =
  | { kind: 'product'; product: schemas['Product']; span: string }
  | { kind: 'creator'; creator: schemas['Organization']; span: string }

/**
 * ShowcaseMosaic — 4 tiles. Hero tile (col-span-2 row-span-2) is always the
 * first product. The 3 secondary tiles are filled with: more products if
 * available, then creator highlights to round it out, then nothing (the
 * grid drops to fewer tiles rather than rendering placeholder content).
 */
function ShowcaseMosaic({
  reduce,
  ease,
  products,
  creators,
}: {
  reduce: boolean
  ease: readonly [number, number, number, number]
  products: schemas['Product'][]
  creators: schemas['Organization'][]
}) {
  const tiles: Tile[] = []

  // Hero tile — first product.
  tiles.push({ kind: 'product', product: products[0], span: 'col-span-2 row-span-2' })

  // Secondary tiles — up to 3 more, drawing from products first then creators.
  const remainingProducts = products.slice(1, 4)
  for (const p of remainingProducts) {
    tiles.push({ kind: 'product', product: p, span: 'col-span-2' })
  }
  // Pad with creator tiles if fewer than 4 products.
  const slotsLeft = 4 - tiles.length
  for (let i = 0; i < slotsLeft && i < creators.length; i++) {
    tiles.push({ kind: 'creator', creator: creators[i], span: 'col-span-2' })
  }

  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-3 md:gap-4">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.kind === 'product' ? tile.product.id : tile.creator.id}
          {...(reduce
            ? { initial: false }
            : {
                initial: { opacity: 0, y: 32, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.7, ease, delay: 0.4 + i * 0.08 },
              })}
          whileHover={reduce ? undefined : { y: -4 }}
          className={cn(
            'group relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--surface-sunken)]',
            tile.span,
          )}
        >
          {tile.kind === 'product' ? (
            <ProductTileBody product={tile.product} />
          ) : (
            <CreatorTileBody creator={tile.creator} />
          )}
        </motion.div>
      ))}
    </div>
  )
}

function ProductTileBody({ product }: { product: schemas['Product'] }) {
  const img = product.medias?.[0]?.public_url
  const price = product.prices?.[0] as
    | { price_amount?: number; price_currency?: string }
    | undefined
  const priceLabel = price?.price_amount
    ? `KSh ${(price.price_amount / 100).toLocaleString('en-KE')}`
    : ''
  const org = (product as unknown as { organization?: { name?: string } }).organization

  return (
    <Link href={`/product/${product.id}`} className="block h-full w-full">
      {img ? (
        <>
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[rgba(15,14,12,0.32)]" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 text-white md:p-5">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
              {org?.name || 'Blyss'}
            </span>
            <div>
              <h3 className="font-display text-[16px] font-medium leading-tight md:text-[18px]">
                {product.name}
              </h3>
              {priceLabel && (
                <p className="mt-1 font-sans text-[12px] tabular-nums text-white/85">
                  {priceLabel}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        /* No image — typographic tile with the product's first letter as
         * a decorative oversized glyph. Pure backend content, no fake copy. */
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {org?.name || 'Blyss'}
          </span>
          <span
            aria-hidden
            className="absolute right-2 top-1 font-display text-[clamp(60px,10vw,120px)] font-light leading-none text-[var(--accent)] opacity-15"
          >
            {product.name.charAt(0).toUpperCase()}
          </span>
          <div className="relative">
            <h3 className="font-display text-[16px] font-medium leading-tight text-[var(--text-primary)] md:text-[18px]">
              {product.name}
            </h3>
            {priceLabel && (
              <p className="mt-1 font-sans text-[12px] tabular-nums text-[var(--text-secondary)]">
                {priceLabel}
              </p>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

function CreatorTileBody({ creator }: { creator: schemas['Organization'] }) {
  const avatarUrl = creator.avatar_url
  const productCount = (creator as unknown as { product_count?: number }).product_count

  return (
    <Link href={`/creators/${creator.slug}`} className="block h-full w-full">
      {avatarUrl ? (
        <>
          <Image
            src={avatarUrl}
            alt={creator.name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[rgba(15,14,12,0.42)]" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 text-white md:p-5">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
              Creator
            </span>
            <div>
              <h3 className="font-display text-[16px] font-medium leading-tight md:text-[18px]">
                {creator.name}
              </h3>
              {typeof productCount === 'number' && (
                <p className="mt-1 font-sans text-[12px] tabular-nums text-white/85">
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Creator
          </span>
          <span
            aria-hidden
            className="absolute right-2 top-1 font-display text-[clamp(60px,10vw,120px)] font-light leading-none text-[var(--accent)] opacity-15"
          >
            {creator.name.charAt(0).toUpperCase()}
          </span>
          <div className="relative">
            <h3 className="font-display text-[16px] font-medium leading-tight text-[var(--text-primary)] md:text-[18px]">
              {creator.name}
            </h3>
            {typeof productCount === 'number' && (
              <p className="mt-1 font-sans text-[12px] tabular-nums text-[var(--text-secondary)]">
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </p>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

/**
 * ShowcaseCreatorPanel — when there are 0 products but creators exist.
 * Shows the first creator as a hero panel with their avatar / banner.
 */
function ShowcaseCreatorPanel({
  reduce,
  ease,
  creators,
}: {
  reduce: boolean
  ease: readonly [number, number, number, number]
  creators: schemas['Organization'][]
}) {
  const primary = creators[0]
  const banner =
    (primary as unknown as { profile_settings?: { cover_image_url?: string } })
      .profile_settings?.cover_image_url ||
    (primary as unknown as { cover_image_url?: string }).cover_image_url ||
    primary.avatar_url

  return (
    <motion.div
      {...(reduce
        ? { initial: false }
        : {
            initial: { opacity: 0, y: 32 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.7, ease, delay: 0.4 },
          })}
      className="relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--surface-sunken)]"
    >
      <Link
        href={`/creators/${primary.slug}`}
        className="group block h-full w-full"
      >
        {banner && (
          <>
            <Image
              src={banner}
              alt={primary.name}
              fill
              sizes="(max-width: 1024px) 90vw, 40vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-[rgba(15,14,12,0.45)]" />
          </>
        )}
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 text-white">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
            Creator on Blyss
          </span>
          <div>
            <h3 className="font-display text-[28px] font-semibold leading-tight md:text-[40px]">
              {primary.name}
            </h3>
            <p className="mt-3 font-sans text-[14px] text-white/90">
              Visit storefront
              <FiArrowUpRight className="ml-1 inline-block align-middle" size={14} />
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * ShowcaseEditorial — last-resort empty state. Genuinely-brand-new platform.
 * Editorial typographic block; no fake products, no fake creators.
 */
function ShowcaseEditorial({
  reduce,
  ease,
}: {
  reduce: boolean
  ease: readonly [number, number, number, number]
}) {
  return (
    <motion.div
      {...(reduce
        ? { initial: false }
        : {
            initial: { opacity: 0, y: 32 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.7, ease, delay: 0.4 },
          })}
      className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-md bg-[var(--surface-sunken)] p-6 md:p-10"
    >
      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Coming up
      </span>
      <div>
        <h3 className="font-display text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
          The next chapter of Kenyan craft, online.
        </h3>
        <p className="mt-4 max-w-[28ch] font-sans text-[14px] text-[var(--text-secondary)]">
          Be among the first creators to publish here. Your work, your terms,
          paid out by the next sunset.
        </p>
        <Link
          href="/start"
          className="mt-6 inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Start a storefront
          <FiArrowRight size={14} />
        </Link>
      </div>
    </motion.div>
  )
}
