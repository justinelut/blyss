import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap, schemas } from '@/lib/api'
import { getServerCurrency } from '@/lib/geo/server'
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

async function fetchCreator(slug: string, currency?: string) {
  const api = await getServerSideAPI()
  return unwrap(
    api.GET('/v1/organizations/creators/{slug}', {
      params: { path: { slug }, query: currency ? { currency } : undefined },
    }),
  )
}

/**
 * Best-effort fetch of the aggregate creator-level review summary +
 * recent reviews. Both endpoints are public and small. We swallow errors so
 * a transient backend hiccup never breaks the storefront render — in that
 * case the ReviewsBlock just falls back to its empty state.
 */
async function fetchOrganizationReviews(organizationId: string): Promise<{
  summary: ReviewSummary | null
  recent: ReviewExcerpt[]
}> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || 'https://api.blyss.co.ke'
  ).replace(/\/$/, '')

  const summaryUrl = `${apiBase}/v1/reviews/organization/${organizationId}/summary`
  const recentUrl = `${apiBase}/v1/reviews/organization/${organizationId}?limit=6`

  // The next-fetch cache is keyed per URL; we tag the requests so the
  // ReviewsBlock cache can be invalidated alongside the storefront on
  // revalidate (60s ISR). We don't pass cookies — these endpoints are
  // public and the storefront SSR is anonymous.
  const init: RequestInit & { next?: { revalidate?: number } } = {
    next: { revalidate: 60 },
  }

  try {
    const [summaryRes, recentRes] = await Promise.all([
      fetch(summaryUrl, init),
      fetch(recentUrl, init),
    ])

    if (!summaryRes.ok || !recentRes.ok) {
      return { summary: null, recent: [] }
    }

    const summaryJson = (await summaryRes.json()) as {
      average_rating: number
      total_reviews: number
    }
    const recentJson = (await recentRes.json()) as Array<{
      id: string
      product_id: string
      product_name: string
      user_name: string
      rating: number
      review_text: string | null
      created_at: string
    }>

    const summary: ReviewSummary | null =
      summaryJson.total_reviews > 0
        ? {
            average: summaryJson.average_rating,
            count: summaryJson.total_reviews,
          }
        : null

    const recent: ReviewExcerpt[] = recentJson
      .filter((r) => r.review_text && r.review_text.trim().length > 0)
      .map((r) => ({
        id: r.id,
        reviewerName: r.user_name,
        createdAt: r.created_at,
        rating: r.rating,
        body: r.review_text || '',
        productName: r.product_name,
        productId: r.product_id,
      }))

    return { summary, recent }
  } catch {
    return { summary: null, recent: [] }
  }
}

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const creator = await fetchCreator(slug)
    const title = `${creator.name} · Kenyan Creator on Blyss`
    // Anti-slop fallback. Original used "the modern creator marketplace"
    // which is exactly the kind of vague-AI prose we're trying to leave
    // behind ("modern" is on the ban list). When the creator hasn't
    // written a bio, name the platform, the country, the payment rail.
    const description =
      creator.bio?.trim() ||
      `${creator.name} sells digital products on Blyss. Buy with M-Pesa or card. Instant delivery after payment.`
    const canonical = `${SITE_BASE}/creators/${creator.slug}`
    // Prefer the creator's banner (16:9, designed to be shareable) for
    // social previews; fall back to avatar then to the OG generator.
    // Twitter / Facebook / WhatsApp / LinkedIn all crop a 1200x630
    // banner cleanly, but a square avatar reads as a tiny circle.
    const bannerUrl =
      ((creator as { cover_image_url?: string | null }).cover_image_url) ??
      ((creator as unknown as { banner_url?: string | null }).banner_url) ??
      null
    const ogImage =
      bannerUrl ||
      creator.avatar_url ||
      `${SITE_BASE}/api/og?title=${encodeURIComponent(creator.name)}`

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
    // Geo currency filter: the storefront lists only this creator's products
    // priced in the visitor's currency (no conversion).
    const currency = await getServerCurrency()
    creator = await fetchCreator(slug, currency)
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

  // The CreatorStorefrontSchema added a `socials` field (Polar's
  // native list) but the frontend OpenAPI types haven't been
  // regenerated yet — cast through `any` so we can read it without
  // a full codegen pass. The field is optional anyway.
  const polarSocials = (creator as any).socials as
    | Array<{ platform?: string; url?: string }>
    | null
    | undefined

  const socialLinks: AboutTabSocialLinks | null =
    polarSocials && polarSocials.length > 0
      ? {
          // Polar's native list — preferred path. AboutTab renders an
          // icon per platform with the dashboard's editor in mind.
          socials: polarSocials.map((s) => ({
            platform: String(s?.platform || 'other'),
            url: String(s?.url || ''),
          })),
        }
      : creator.social_links
        ? {
            // Legacy 3-field shape, kept for orgs that haven't been
            // migrated to populate socials yet.
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

  // Aggregate reviews — best-effort, never throws.
  const { summary: reviewSummary, recent: recentReviews } =
    await fetchOrganizationReviews(creator.id)

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
          // Storefront theme tokens (plan §19). Passed through to the
          // <StorefrontThemeProvider> wrapper inside the body. Falls
          // back to v1 defaults inside the provider when the field is
          // absent (e.g. an older API response shape pre-12.1).
          themeTokens:
            ((creator as unknown as { theme_tokens?: unknown })
              .theme_tokens as
              | import('@/types/storefront-theme').StorefrontTokens
              | undefined) ?? null,
          // Plan §19.4 layout slug — falls back to 'editorial' inside
          // resolveStorefrontLayout when the field is absent or unknown.
          themeLayout:
            ((creator as unknown as { theme_layout?: unknown })
              .theme_layout as
              | import('@/types/storefront-theme').StorefrontLayoutSlug
              | undefined) ?? null,
          themeModules:
            ((creator as unknown as { theme_modules?: unknown })
              .theme_modules as
              | import('@/types/storefront-theme').EnabledModule[]
              | undefined) ?? null,
        }}
        products={products}
        reviewSummary={reviewSummary}
        recentReviews={recentReviews}
      />
    </>
  )
}
