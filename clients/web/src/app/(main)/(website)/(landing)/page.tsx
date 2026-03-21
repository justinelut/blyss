import { unwrap } from '@/lib/api'
import { createServerSideAPI } from '@/utils/client'
import { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import HomePage from './HomePage'

export const metadata: Metadata = {
  title: 'Blyss — Sell Digital Products in Kenya',
  description:
    'Sell digital products in Kenya with ease. Create your online store, accept M-Pesa payments, and reach customers across Kenya.',
  keywords:
    'sell digital products kenya, online marketplace kenya, mpesa payments, digital downloads, sell courses online kenya, kenyan creators, digital products platform, online store kenya, e-commerce kenya, sell ebooks kenya',
  openGraph: {
    siteName: 'Blyss',
    type: 'website',
    images: [
      {
        url: 'https://blyss.co.ke/assets/brand/blyss_og.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://blyss.co.ke/assets/brand/blyss_og.jpg',
        width: 1200,
        height: 630,
        alt: 'Blyss',
      },
    ],
  },
}

async function getFeaturedProducts() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    const result = await unwrap(
      serverApi.GET('/v1/products/public', {
        params: {
          query: {
            is_featured: true,
            limit: 8,
            page: 1,
          },
        },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch featured products:', error)
    return []
  }
}

async function getFeaturedSubscriptions() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    const result = await unwrap(
      serverApi.GET('/v1/subscriptions/public', {
        params: {
          query: {
            is_featured: true,
            limit: 6,
          },
        },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch featured subscriptions:', error)
    return []
  }
}

async function getTrendingCreators() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    const result = await unwrap(
      serverApi.GET('/v1/organizations/public', {
        params: {
          query: {
            is_featured: true,
            limit: 6,
          },
        },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch trending creators:', error)
    return []
  }
}

async function getCategories() {
  try {
    const cookieStore = await cookies()
    const headersList = await headers()
    const serverApi = await createServerSideAPI(headersList, cookieStore)

    const result = await unwrap(
      serverApi.GET('/v1/categories/', {
        params: {
          query: {
            limit: 10,
          },
        },
      }),
    )
    return result.items
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

export default async function Page() {
  const [featuredProducts, featuredSubscriptions, trendingCreators, categories] =
    await Promise.all([
      getFeaturedProducts(),
      getFeaturedSubscriptions(),
      getTrendingCreators(),
      getCategories(),
    ])

  return (
    <HomePage
      featuredProducts={featuredProducts}
      featuredSubscriptions={featuredSubscriptions}
      trendingCreators={trendingCreators}
      categories={categories}
    />
  )
}
