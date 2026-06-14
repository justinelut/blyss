/* Hallmark · macrostructure: Marquee Hero + Long Document · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Marquee · Editorial letter · Trending · Categories · Creators
 *           · Subscriptions · Process · Closing dark band
 * nav: N5 floating-pill (inherited from MarketplaceShell)
 * footer: Ft5 statement (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 51–55, 66, 67)
 *
 * Reference DNA: Aimé Leon Dore (marquee + editorial cadence) + SSENSE
 * (editorial-first home, photography carries color). The editorial letter
 * (NoteFromMakers) sits between hero and product grid — the voice sets the
 * cadence before the catalog speaks.
 */
import { schemas } from '@/lib/api'
import { JsonLd } from '@/design'
import { Hero } from '@/components/Marketplace/Hero'
import { ContinueShopping } from '@/components/Marketplace/ContinueShopping'
import { TrendingProducts } from '@/components/Marketplace/TrendingProducts'
import { BrowseByCraft, type CategoryTile } from '@/components/Marketplace/BrowseByCraft'
import { FeaturedCreators } from '@/components/Marketplace/FeaturedCreators'
import { FeaturedSubscriptions } from '@/components/Marketplace/FeaturedSubscriptions'
import { NoteFromMakers } from '@/components/Marketplace/NoteFromMakers'
import { HowItWorks } from '@/components/Marketplace/HowItWorks'
import { ClosingCtaBand } from '@/components/Marketplace/ClosingCtaBand'

interface HomePageProps {
  featuredProducts: schemas['Product'][]
  featuredSubscriptions: schemas['Subscription'][]
  trendingCreators: schemas['Organization'][]
  categories: CategoryTile[]
}

/**
 * HomePage — server component composing all home sections per plan §6.1.
 *
 * Sections in order: Hero · TrendingProducts · BrowseByCraft · FeaturedCreators
 * · FeaturedSubscriptions · NoteFromMakers · HowItWorks · ClosingCtaBand.
 *
 * Production-grade content rules (no fake / seed fallbacks):
 * - Hero scales gracefully from 0 → 4+ products. The right-column showcase
 *   pulls in real creators when products are sparse.
 * - TrendingProducts hides itself when zero products exist.
 * - BrowseByCraft hides when no real categories are configured.
 * - FeaturedCreators hides when no creators exist.
 * - FeaturedSubscriptions hides when no recurring products exist.
 * - NoteFromMakers + HowItWorks + ClosingCtaBand always render — they are
 *   editorial about-Blyss copy, not catalog data.
 *
 * No `'use client'` directive — this is a pure RSC. Individual sections that
 * need motion are themselves client components.
 *
 * JSON-LD structured data for SEO injected here once at the page level
 * (WebSite + Organization). Per plan §8.3.
 */
export default function HomePage({
  featuredProducts,
  featuredSubscriptions,
  trendingCreators,
  categories,
}: HomePageProps) {
  // Real data only — no seed fallbacks. Sections handle empty states.
  const products = featuredProducts ?? []
  const subs = featuredSubscriptions ?? []
  const creators = trendingCreators ?? []
  const cats = categories ?? []

  return (
    <>
      {/* SEO structured data */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Blyss',
          url: 'https://blyss.co.ke',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://blyss.co.ke/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Blyss',
          url: 'https://blyss.co.ke',
          logo: 'https://cdn.blyss.co.ke/brand/og-default.png',
          description:
            'The modern modern marketplace for digital products. Sell digital products and subscriptions, paid via M-Pesa or card.',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Nairobi',
            addressCountry: 'KE',
          },
          sameAs: [
            'https://instagram.com/blyss.co.ke',
            'https://x.com/blyss_co_ke',
          ],
        }}
      />

      <Hero
        showcaseProducts={products.slice(0, 4)}
        showcaseCreators={creators.slice(0, 4)}
      />
      {/* Long Document cadence (Hallmark macrostructure):
          editorial letter → product band → category band → creator band →
          recurring band → process steps → closing dark band.
          ContinueShopping sits above the editorial letter so visitors with
          a pending cart or recently-viewed history land on intent first.
          The component self-hides for first-time / no-history visitors. */}
      <ContinueShopping />
      <NoteFromMakers />
      {products.length > 0 && <TrendingProducts products={products} />}
      {cats.length > 0 && <BrowseByCraft categories={cats} />}
      {creators.length > 0 && <FeaturedCreators creators={creators} />}
      {subs.length > 0 && <FeaturedSubscriptions subscriptions={subs} />}
      <HowItWorks />
      <ClosingCtaBand />
    </>
  )
}
