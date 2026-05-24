import { ProductDetailView } from '@/components/Product/ProductDetailView'
import { SkipLink } from '@/components/Shared/SkipLink'
import { createServerSideAPI } from '@/utils/client'
// import { createServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@/lib/api'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface ProductDetailPageProps {
  params: { slug: string }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const api = await createServerSideAPI(await headers(), await cookies())

  try {
    const product = await unwrap(
      api.GET('/v1/products/{slug}', {
        params: { path: { slug: params.slug } },
      }),
    )

    const title = `${product.name} | Blyss Marketplace`
    const description =
      product.description?.slice(0, 160) ||
      `Buy ${product.name} from ${product.organization?.name || 'Blyss Marketplace'}`

    const images = product.medias
      ?.filter((media) => media.mime_type?.startsWith('image/'))
      .map((media) => ({
        url: media.public_url || '',
        width: 1200,
        height: 630,
        alt: product.name,
      }))

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'Blyss',
        type: 'website',
        images: images || [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: images || [],
      },
      alternates: {
        canonical: `/product/${params.slug}`,
      },
      robots: {
        index: !product.is_archived,
        follow: true,
      },
    }
  } catch {
    return {
      title: 'Product Not Found | Blyss',
      description: 'The product you are looking for does not exist.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const api = await createServerSideAPI(await headers(), await cookies())

  try {
    const product = await unwrap(
      api.GET('/v1/products/{slug}', {
        params: { path: { slug: params.slug } },
      }),
    )

    // Get the first price for structured data
    const firstPrice = product.prices?.[0]
    const priceAmount = firstPrice
      ? (firstPrice.price_amount / 100).toFixed(2)
      : '0.00'
    const priceCurrency = firstPrice?.price_currency?.toUpperCase() || 'KES'

    // Generate Product structured data (Schema.org)
    const productStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || '',
      image:
        product.medias
          ?.filter((media) => media.mime_type?.startsWith('image/'))
          .map((media) => media.public_url) || [],
      brand: product.organization?.name
        ? {
            '@type': 'Brand',
            name: product.organization.name,
          }
        : undefined,
      offers: {
        '@type': 'Offer',
        price: priceAmount,
        priceCurrency: priceCurrency,
        availability: product.is_archived
          ? 'https://schema.org/Discontinued'
          : 'https://schema.org/InStock',
        url: `https://blyss.co.ke/product/${params.slug}`,
        seller: product.organization?.name
          ? {
              '@type': 'Organization',
              name: product.organization.name,
            }
          : undefined,
      },
      sku: product.id,
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productStructuredData),
          }}
        />
        <SkipLink />
        <main id="main-content" className="container mx-auto px-4 py-8">
          <ProductDetailView product={product} />
        </main>
      </>
    )
  } catch (error) {
    notFound()
  }
}
