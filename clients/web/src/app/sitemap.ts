import { CONFIG } from '@/utils/config'
import { MetadataRoute } from 'next'

/**
 * Dynamic sitemap.
 *
 * Replaces the Polar-fork legacy sitemap that pointed at routes that
 * no longer exist on Blyss (/features/*, /resources/*, /customers/*,
 * /docs, /careers) — every entry below is a real, indexable route as
 * of 2026-06.
 *
 * Dynamic URLs (creator storefronts + individual products) are fetched
 * at build / revalidation time from the public listing endpoints. Both
 * are server-side fetches with a short cache (the page-level revalidate
 * already caps how often this runs).
 *
 * Categories pull from `CATEGORY_INTRO_SLUGS` so any newly-curated
 * SEO copy automatically shows up in the sitemap.
 */

const SITE = 'https://blyss.co.ke'

interface CreatorLite {
  slug: string
  modified_at?: string | null
}
interface ProductLite {
  id: string
  modified_at?: string | null
}

async function fetchCreators(): Promise<CreatorLite[]> {
  try {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL ||
      'https://api.blyss.co.ke'
    ).replace(/\/$/, '')
    const res = await fetch(
      `${apiBase}/v1/organizations/creators?limit=100`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as CreatorLite[] | { items?: CreatorLite[] }
    if (Array.isArray(data)) return data
    return data.items ?? []
  } catch {
    return []
  }
}

async function fetchProducts(): Promise<ProductLite[]> {
  try {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL ||
      'https://api.blyss.co.ke'
    ).replace(/\/$/, '')
    const res = await fetch(
      `${apiBase}/v1/products/public?limit=100&sort=newest`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { items?: ProductLite[] }
    return data.items ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (CONFIG.IS_SANDBOX) {
    return []
  }

  const now = new Date()

  // Top-level routes that every crawler should see. Priority reflects
  // commercial importance (home > start = marketplace > category > legal).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/start`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE}/creators`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/refunds`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/acceptable-use`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Curated category pages — high SEO value because they have
  // long-form intro copy targeting buyer-side long-tail queries
  // (see `lib/seo/category-copy.ts`).
  const { CATEGORY_INTRO_SLUGS } = await import('@/lib/seo/category-copy')
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_INTRO_SLUGS.map(
    (slug) => ({
      url: `${SITE}/category/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }),
  )

  // Dynamic creator + product routes. Both fetch in parallel; fetch
  // failures fall back to empty lists so the sitemap is always at
  // least the static surface.
  const [creators, products] = await Promise.all([
    fetchCreators(),
    fetchProducts(),
  ])

  const creatorRoutes: MetadataRoute.Sitemap = creators.map((c) => ({
    url: `${SITE}/creators/${c.slug}`,
    lastModified: c.modified_at ? new Date(c.modified_at) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE}/product/${p.id}`,
    lastModified: p.modified_at ? new Date(p.modified_at) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...creatorRoutes,
    ...productRoutes,
  ]
}
