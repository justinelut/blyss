import { schemas } from '@/lib/api'
import { JsonLd } from '@/design'
import { Hero } from '@/components/Marketplace/Hero'
import { TrendingProducts } from '@/components/Marketplace/TrendingProducts'
import { BrowseByCraft, type CategoryTile } from '@/components/Marketplace/BrowseByCraft'
import { FeaturedCreators } from '@/components/Marketplace/FeaturedCreators'
import { FeaturedSubscriptions } from '@/components/Marketplace/FeaturedSubscriptions'
import { NoteFromMakers } from '@/components/Marketplace/NoteFromMakers'
import { HowItWorks } from '@/components/Marketplace/HowItWorks'
import { ClosingCtaBand } from '@/components/Marketplace/ClosingCtaBand'
import {
  SEED_PRODUCTS,
  SEED_SUBSCRIPTIONS,
  SEED_CREATORS,
  SEED_CATEGORIES,
} from '@/data/seed-marketplace'

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
  // Use seed data as fallback when API is empty so the landing never feels barren.
  const products = featuredProducts?.length ? featuredProducts : SEED_PRODUCTS
  const subs = featuredSubscriptions?.length ? featuredSubscriptions : (SEED_SUBSCRIPTIONS as unknown as schemas['Subscription'][])
  const creators = trendingCreators?.length ? trendingCreators : SEED_CREATORS
  const cats = categories?.length ? categories : SEED_CATEGORIES

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
            'The modern marketplace for Kenyan creators. Sell digital products and subscriptions, paid via M-Pesa or card.',
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

      <Hero showcaseProducts={products.slice(0, 4)} />
      <TrendingProducts products={products} />
      <BrowseByCraft categories={cats} />
      <FeaturedCreators creators={creators} />
      <FeaturedSubscriptions subscriptions={subs} />
      <NoteFromMakers />
      <HowItWorks />
      <ClosingCtaBand />
    </>
  )
}
