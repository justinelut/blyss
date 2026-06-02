import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap, schemas } from '@/lib/api'
import { JsonLd } from '@/design'
import {
  CreatorStorefrontPage,
  type ReviewExcerpt,
  type ReviewSummary,
} from '@/components/CreatorStorefront'
import type { AboutTabSocialLinks } from '@/components/CreatorStorefront'

// ISR — regenerate the storefront at most once per minute. Per plan §6.4
// "performance" + the project ISR convention.
export const revalidate = 60

const SITE_BASE = 'https://blyss.co.ke'

interface CreatorPageProps {
  params: Promise<{ slug: string }>
}

/**
 * /creators/[slug] — Creator storefront (plan §6.4).
 *
 * Server component: fetches the creator + their products from
 * `/v1/organizations/creators/{slug}` (CreatorStorefrontSchema), emits
 * Person JSON-LD with the creator's product list as `subjectOf.itemListElement`,
 * sets canonical + OG metadata, and hands off to the
 * <CreatorStorefrontPage> client island for tab state.
 *
 * Reviews aggregation: the public API doesn't yet expose creator-level
 * review summary or recent-reviews endpoints — phase 7 wires those. Until
 * then we pass `null`/`[]` and the ReviewsBlock renders its editorial empty
 * state.
 */

async function fetchCreator(slug: string) {
  const api = await getServerSideAPI()
  return unwrap(
    api.GET('/v1/organizations/creators/{slug}', {
      params: { path: { slug } },
    }),
  )
}

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const creator = await fetchCreator(slug)
    const title = `${creator.name} — Digital products on Blyss`
    const description =
      creator.bio?.trim() ||
      `Digital products and subscriptions from ${creator.name}, on Blyss — Kenya's modern creator marketplace.`
    const canonical = `${SITE_BASE}/creators/${creator.slug}`
    const ogImage = creator.avatar_url || `${SITE_BASE}/api/og?title=${encodeURIComponent(creator.name)}`

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'Blyss',
        type: 'profile',
        locale: 'en_KE',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${creator.name} on Blyss`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      robots: { index: true, follow: true },
    }
  } catch {
    return {
      title: 'Creator not found · Blyss',
      robots: { index: false, follow: false },
    }
  }
}

export default async function Page({ params }: CreatorPageProps) {
  const { slug } = await params

  let creator: schemas['CreatorStorefrontSchema'] | null = null
  try {
    creator = await fetchCreator(slug)
  } catch {
    notFound()
  }

  if (!creator) notFound()

  // Defensive read of fields that aren't strictly typed on the public schema
  // but are returned by the backend (banner image, public email opt-in flag,
  // city). Fall back gracefully.
  const raw = creator as unknown as Record<string, unknown> & typeof creator
  const bannerUrl =
    ((creator as { cover_image_url?: string | null }).cover_image_url) ??
    (raw['banner_url'] as string | null | undefined) ??
    ((raw['profile_settings'] as Record<string, unknown> | undefined)?.[
      'cover_image_url'
    ] as string | null | undefined) ??
    null
  const city = (raw['city'] as string | null | undefined) ?? null
  const tipEnabled =
    (raw['donations_enabled'] as boolean | undefined) ?? true

  const socialLinks: AboutTabSocialLinks | null = creator.social_links
    ? {
        twitter: creator.social_links.twitter ?? null,
        instagram: creator.social_links.instagram ?? null,
        website: creator.social_links.website ?? null,
      }
    : null

  // Email is only shown when the creator opted in to expose it. The backend
  // currently always returns it on this endpoint; phase-7 adds an opt-in
  // flag. Until then, pass it through.
  const publicEmail = (creator as unknown as { email?: string | null }).email ?? null

  // Treat the bundled `products` array as Polar Product objects.
  const products = (creator.products ?? []) as schemas['Product'][]

  // Reviews: not wired yet — pass null/[] to render the empty state.
  const reviewSummary: ReviewSummary | null = null
  const recentReviews: ReviewExcerpt[] = []

  // Person JSON-LD — Google reads this for knowledge-graph entries.
  const canonical = `${SITE_BASE}/creators/${creator.slug}`
  const personLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.name,
    url: canonical,
    description: creator.bio || undefined,
    image: creator.avatar_url || undefined,
    sameAs: [
      socialLinks?.twitter,
      socialLinks?.instagram,
      socialLinks?.website,
    ].filter(Boolean),
  }

  // Attach the product catalog as a subjectOf ItemList. Helps Google
  // surface the creator's storefront alongside their products in search.
  if (products.length > 0) {
    personLd['subjectOf'] = {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 24).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_BASE}/product/${p.id}`,
        name: p.name,
      })),
    }
  }

  // Breadcrumb JSON-LD — gives Google a path Marketplace > Creators > {name}.
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blyss', item: SITE_BASE },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Creators',
        item: `${SITE_BASE}/creators`,
      },
      { '@type': 'ListItem', position: 3, name: creator.name, item: canonical },
    ],
  }

  return (
    <>
      <JsonLd data={personLd} />
      <JsonLd data={breadcrumbLd} />
      <CreatorStorefrontPage
        creator={{
          id: creator.id,
          name: creator.name,
          slug: creator.slug,
          avatarUrl: creator.avatar_url,
          bannerUrl,
          bio: creator.bio,
          city,
          email: publicEmail,
          socialLinks,
          tipEnabled,
        }}
        products={products}
        reviewSummary={reviewSummary}
        recentReviews={recentReviews}
      />
    </>
  )
}
