'use client'

/* Hallmark · macrostructure: Letter + Portfolio Grid · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Storefront hero (banner + identity + Subscribe/Tip CTAs) ·
 *           Sticky tabs (hairline underline, accent-rule on active) ·
 *           Active panel (work / subscriptions / about) · Reviews
 * nav: N5/N9 (inherited) · footer: Ft5 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 66, 67)
 *
 * Reference DNA: Bandcamp artist + Substack writer profiles — banner +
 * one-line bio + clear primary CTA, then a portfolio grid below. No drop-
 * shadow cards, no pill tabs, no star-rating runs.
 */

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { schemas } from '@/lib/api'
import { StorefrontHero } from './StorefrontHero'
import { CreatorStorefrontFooter } from './CreatorStorefrontFooter'
import {
  StorefrontTabs,
  type StorefrontTab,
  type StorefrontTabId,
} from './StorefrontTabs'
import { AllWorkTab } from './AllWorkTab'
import { SubscriptionsTab } from './SubscriptionsTab'
import { AboutTab, type AboutTabSocialLinks } from './AboutTab'
import { StorefrontActionBar } from './StorefrontActionBar'
import { ReviewsBlock, type ReviewSummary, type ReviewExcerpt } from './ReviewsBlock'
import { useCurrencyControls } from '@/components/Marketplace/CurrencyProvider'
import { StorefrontThemeProvider } from '@/components/Storefront/StorefrontThemeProvider'
import type { StorefrontTokens } from '@/types/storefront-theme'

export interface CreatorStorefrontPageProps {
  /** Creator core fields, sourced from the public CreatorStorefrontSchema. */
  creator: {
    id: string
    name: string
    slug: string
    avatarUrl?: string | null
    bannerUrl?: string | null
    bio?: string | null
    city?: string | null
    email?: string | null
    socialLinks?: AboutTabSocialLinks | null
    /** Whether the creator opted into accepting tips / donations. v1: always
     *  true if the backend doesn't expose the flag; phase-7 wires the gate. */
    tipEnabled?: boolean
    /** Storefront theme tokens (plan §19). When omitted the provider
     *  falls back to v1 defaults so the storefront still renders. */
    themeTokens?: StorefrontTokens | null
  }
  /** All non-archived products by this creator, returned by the storefront
   *  endpoint. We split on `is_recurring` to derive subscription tiers. */
  products: schemas['Product'][]
  /** Optional aggregate review summary across the creator's products. Pass
   *  null until phase-7 wires the creator-level review aggregate endpoint. */
  reviewSummary?: ReviewSummary | null
  /** Optional last-6 reviews. Empty array renders the block's empty state. */
  recentReviews?: ReviewExcerpt[]
}

const TAB_PARAM = 'tab' as const

/**
 * CreatorStorefrontPage — the full /creators/[slug] surface.
 *
 * Per plan/07-pages.md §6.4. Section order:
 *   1) StorefrontHero — banner + identity overlay + Subscribe / Tip CTAs
 *   2) StorefrontTabs — sticky under the marketplace header
 *   3) Active tab panel — All work / Subscriptions / About
 *   4) ReviewsBlock — aggregate + last 6 (or empty state)
 *
 * Tab state lives in the URL via `nuqs` so the surface is shareable
 * (creators paste `/creators/jane?tab=subscriptions` in their bios). Default
 * tab is `work`. The "Subscribe" CTA on the hero deep-links to the
 * subscriptions tab and scrolls to it.
 *
 * The footer is provided by the surrounding `(main)/creators/layout.tsx`
 * — we do NOT render it here so the layout can be reused on the directory.
 */
export function CreatorStorefrontPage({
  creator,
  products,
  reviewSummary,
  recentReviews = [],
}: CreatorStorefrontPageProps) {
  const tabsAnchorRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const { country } = useCurrencyControls()

  // Tab state — URL-driven via nuqs. Replace history (don't push) so the back
  // button takes users out of the storefront, not back through tab clicks.
  const [tab, setTab] = useQueryState<StorefrontTabId>(
    TAB_PARAM,
    parseAsStringEnum<StorefrontTabId>([
      'work',
      'subscriptions',
      'about',
    ]).withDefault('work'),
  )

  // Split products into work (one-time) and subscription tiers (recurring).
  const { work, tiers } = useMemo(() => {
    const work: schemas['Product'][] = []
    const tiers: schemas['Product'][] = []
    for (const p of products) {
      if (p.is_recurring) tiers.push(p)
      else work.push(p)
    }
    return { work, tiers }
  }, [products])

  // Tabs definition — Subscriptions tab is rendered always (so users see the
  // creator's tier model exists), but disabled when there are no tiers. About
  // is enabled when there's a bio, social links, OR an email.
  const aboutHasContent =
    !!creator.bio?.trim() ||
    !!creator.email ||
    !!(
      creator.socialLinks &&
      (creator.socialLinks.twitter ||
        creator.socialLinks.instagram ||
        creator.socialLinks.website)
    )

  const tabs: StorefrontTab[] = [
    { id: 'work', label: 'All work', count: products.length },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      count: tiers.length || undefined,
      disabled: tiers.length === 0,
    },
    { id: 'about', label: 'About', disabled: !aboutHasContent },
  ]

  const handleSubscribeClick = () => {
    if (tiers.length > 0) {
      setTab('subscriptions')
      // Scroll to tabs strip — gives the user immediate context that we
      // navigated to the tier list.
      window.requestAnimationFrame(() => {
        tabsAnchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }
  }

  const handleTipClick = () => {
    // Navigate to the dedicated donation page. URL is locale-prefixed so the
    // page renders inside the right region's chrome and Paystack picks the
    // right channel.
    router.push(`/${country}/donation/${creator.slug}`)
  }

  return (
    <StorefrontThemeProvider
      tokens={creator.themeTokens ?? null}
      className="bg-[var(--background)] text-[var(--text-primary)]"
    >
      <StorefrontHero
        name={creator.name}
        slug={creator.slug}
        organizationId={creator.id}
        bio={creator.bio}
        avatarUrl={creator.avatarUrl}
        bannerUrl={creator.bannerUrl}
        city={creator.city ?? 'Nairobi'}
        hasSubscriptions={tiers.length > 0}
        tipEnabled={creator.tipEnabled ?? true}
        onSubscribeClick={handleSubscribeClick}
        onTipClick={handleTipClick}
      />

      {/* Anchor used by the Subscribe CTA to scroll into view */}
      <div ref={tabsAnchorRef} aria-hidden="true" />

      <StorefrontTabs
        tabs={tabs}
        active={tab}
        onChange={(next) => setTab(next)}
        actions={
          <StorefrontActionBar
            slug={creator.slug}
            organizationId={creator.id}
          />
        }
      />

      {/* Active tab panel — accessibility ids match StorefrontTabs */}
      <div
        id={`storefront-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`storefront-tab-${tab}`}
      >
        {tab === 'work' && (
          <AllWorkTab products={products} creatorName={creator.name} />
        )}
        {tab === 'subscriptions' && (
          <SubscriptionsTab
            tiers={tiers}
            creatorName={creator.name}
            hasOtherWork={work.length > 0}
          />
        )}
        {tab === 'about' && (
          <AboutTab
            name={creator.name}
            slug={creator.slug}
            bio={creator.bio}
            socials={creator.socialLinks}
            email={creator.email}
          />
        )}
      </div>

      {/* Reviews block — always rendered below the active panel so it appears
          regardless of which tab is open; the storefront's social proof is
          part of the page identity, not a tab. */}
      <ReviewsBlock
        creatorName={creator.name}
        summary={reviewSummary ?? null}
        recent={recentReviews}
        allReviewsHref={
          recentReviews.length > 6
            ? `/creators/${creator.slug}/reviews`
            : undefined
        }
      />

      {/* Creator-owned footer — replaces the standard Blyss marketplace
          footer on this route. The MarketplaceShell suppresses chrome
          for /creators/{slug}, so this is the canonical footer for the
          storefront. Carries the creator's wordmark, full bio, social
          links, and an inconspicuous 'Powered by Blyss' attribution. */}
      <CreatorStorefrontFooter
        name={creator.name}
        slug={creator.slug}
        bio={creator.bio}
        city={creator.city}
        email={creator.email}
        socials={creator.socialLinks}
      />
    </StorefrontThemeProvider>
  )
}
