import { ProductDetailView } from '@/components/Product/ProductDetailView'
import { createServerSideAPI } from '@/utils/client/serverside'
import { unwrap } from '@polar-sh/client'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'

interface ProductDetailPageProps {
  params: { slug: string }
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

    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetailView product={product} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
