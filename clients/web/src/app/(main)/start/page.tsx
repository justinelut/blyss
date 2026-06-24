import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { api } from '@/utils/client'
import { StartLanding } from './StartLanding'
import type { ProductCategory, CreatorCategory } from './StartLanding'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Start Selling Digital Products in Kenya',
  description:
    'Set up your Blyss storefront in 10 minutes. Sell templates, ebooks, beats, presets, or courses. 24-hour payouts to your M-Pesa or bank account.',
  keywords:
    'sell digital products Kenya, sell ebooks Kenya, sell beats Kenya, sell presets Kenya, M-Pesa creator payouts, become a creator Kenya, Blyss storefront, online business Kenya',
  alternates: { canonical: 'https://blyss.co.ke/start' },
  openGraph: {
    title: 'Start Selling Digital Products in Kenya',
    description:
      'Set up your Blyss storefront in 10 minutes. M-Pesa or card payments. 24-hour payouts.',
    type: 'website',
    locale: 'en_KE',
    url: 'https://blyss.co.ke/start',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Start selling',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Selling',
    description:
      'Sell digital products. 24-hour payouts.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
}

/**
 * Fetch the live product-category list. We use this as the "What can I
 * sell?" answer so the page reflects what the marketplace
 * actually accepts (Templates, Ebooks, Beats and Music, Presets,
 * Courses, Photography, Software …) rather than 6 hardcoded examples
 * that drift out of sync. Errors are swallowed — the start page must
 * render even if the categories endpoint flaps; StartLanding falls
 * back to a curated short list in that case.
 */
async function fetchProductCategories(): Promise<ProductCategory[]> {
  try {
    const result = await unwrap(api.GET('/v1/categories/', {}))
    return ((result.items ?? []) as Array<{
      id: string
      name: string
      slug: string
      description: string | null
      product_count: number
      is_active: boolean
    }>)
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        product_count: c.product_count,
      }))
  } catch {
    return []
  }
}

/**
 * Fetch the live creator-category list. Used to answer "Who else is
 * already?" — designers, photographers, musicians, writers
 * etc. Same fail-soft behaviour as fetchProductCategories.
 */
async function fetchCreatorCategories(): Promise<CreatorCategory[]> {
  try {
    const result = (await unwrap(
      (api as any).GET('/v1/creator-categories/', {}),
    )) as Array<{ id: string; slug: string; name: string }>
    return (result ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }))
  } catch {
    return []
  }
}

export default async function Page() {
  const [productCategories, creatorCategories, stats] = await Promise.all([
    fetchProductCategories(),
    fetchCreatorCategories(),
    fetchMarketplaceStats(),
  ])
  return (
    <StartLanding
      productCategories={productCategories}
      creatorCategories={creatorCategories}
      stats={stats}
    />
  )
}

interface StartStats {
  creators: number
  products: number
  total_paid_out: number
  total_earned: number
  total_paid_out_currency: string
  settlements_count: number
}

async function fetchMarketplaceStats(): Promise<StartStats | null> {
  try {
    const result = (await (
      api as unknown as {
        GET: (
          path: string,
          init: { params: { query: Record<string, unknown> } },
        ) => Promise<{ data?: StartStats; error?: unknown }>
      }
    ).GET('/v1/marketplace/stats', { params: { query: {} } })) as {
      data?: StartStats
      error?: unknown
    }
    return result?.data ?? null
  } catch (error) {
    console.error('start: failed to fetch marketplace stats', error)
    return null
  }
}
