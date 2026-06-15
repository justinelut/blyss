import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSideAPI } from '@/utils/client/serverside'
import { unwrap, schemas } from '@/lib/api'
import { getServerCurrency } from '@/lib/geo/server'
import { JsonLd } from '@/design'
import { ProductBreadcrumb } from '@/components/ProductDetail'
import { ProductDetailClient } from '@/components/ProductDetail/ProductDetailClient'

export const revalidate = 60
const SITE = 'https://blyss.co.ke'

interface Props { params: Promise<{ id: string }> }

async function fetchProduct(id: string, currency?: string) {
  const api = await getServerSideAPI()
  return unwrap(
    api.GET('/v1/products/slug/{slug}', {
      params: {
        path: { slug: id },
        query: currency ? { currency } : {},
      },
    }),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const p = await fetchProduct(id)
    const org = (p as any).organization
    const creatorName = org?.name ?? 'creator'
    const title = `${p.name} by ${creatorName}`
    // Anti-slop fallback: when a creator hasn't filled in their product
    // description, generate copy that names the product, the creator,
    // and the payment rail rather than a generic "Buy X".
    // Concrete > vague for both Google and AI search.
    const desc =
      p.description?.slice(0, 160) ||
      `${p.name} by ${creatorName}. Buy with M-Pesa or card. Instant download after payment.`
    const img = p.medias?.[0]?.public_url ?? `${SITE}/api/og/product/${p.id}`
    return {
      title,
      description: desc,
      alternates: { canonical: `${SITE}/product/${p.id}` },
      openGraph: { title, description: desc, url: `${SITE}/product/${p.id}`, siteName: 'Blyss', type: 'website', locale: 'en_KE', images: [{ url: img, width: 1200, height: 630, alt: p.name }] },
      twitter: { card: 'summary_large_image', title, description: desc, images: [img] },
      robots: { index: !p.is_archived, follow: true },
    }
  } catch { return { title: 'Product not found', robots: { index: false } } }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const visitorCurrency = await getServerCurrency()
  let product: schemas['Product']
  // Region gate: if the creator didn't price this product in the visitor's
  // currency, the backend 404s (we don't convert). Treat as not-found.
  try { product = await fetchProduct(id, visitorCurrency) } catch { notFound() }

  const org = (product as any).organization as { name?: string; slug?: string } | undefined
  // Prefer the price in the visitor's currency for structured data.
  const prices = (product.prices ?? []) as any[]
  const price =
    prices.find(
      (p) => (p?.price_currency ?? '').toLowerCase() === visitorCurrency.toLowerCase(),
    ) ?? prices[0]
  const amount = (price as any)?.price_amount ?? 0
  const currency = ((price as any)?.price_currency ?? visitorCurrency).toUpperCase()

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.medias?.filter((m) => m.public_url).map((m) => m.public_url) ?? [],
    sku: product.id,
    url: `${SITE}/product/${product.id}`,
    brand: org?.name ? { '@type': 'Brand', name: org.name } : undefined,
    offers: {
      '@type': 'Offer',
      price: (amount / 100).toFixed(2),
      priceCurrency: currency,
      availability: product.is_archived ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock',
      url: `${SITE}/product/${product.id}`,
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Browse', item: `${SITE}/marketplace` },
      { '@type': 'ListItem', position: 2, name: product.name, item: `${SITE}/product/${product.id}` },
    ],
  }

  const crumbs = [
    { label: 'Browse', href: '/marketplace' },
    { label: product.name },
  ]

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="bg-[var(--background)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-[1280px] px-6 pt-4 md:px-16">
          <ProductBreadcrumb crumbs={crumbs} />
        </div>
        <ProductDetailClient product={product} />
      </div>
    </>
  )
}
