import { schemas } from '@/lib/api'
import Link from 'next/link'
import { Heart, ArrowRight } from 'lucide-react'

interface ProductsGridProps {
  products: schemas['Product'][]
  isLoading?: boolean
}

const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-lg bg-surface-container-lowest">
    <div className="relative m-2 aspect-4/5 animate-pulse overflow-hidden rounded-sm bg-surface-container"></div>
    <div className="p-5">
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-surface-container"></div>
      <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-surface-container"></div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 animate-pulse rounded bg-surface-container"></div>
        <div className="h-4 w-12 animate-pulse rounded bg-surface-container"></div>
      </div>
    </div>
  </div>
)

export default function ProductsGrid({ products, isLoading = false }: ProductsGridProps) {
  return (
    <section className="bg-surface-container-low py-16">
      <div className="mx-auto max-w-7xl px-8">
        <div className="mb-12">
          <h2 className="font-headline mb-3 text-3xl">Top Digital Assets</h2>
          <p className="max-w-xl text-sm text-on-surface-variant">
            Handpicked items from our community that are trending across the continent.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </>
          ) : (
            products.slice(0, 4).map((product) => {
              const organization = product.organization as schemas['Organization']
              const price = product.prices?.[0]

              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-lg bg-surface-container-lowest"
                >
                  <div className="relative m-2 aspect-4/5 overflow-hidden rounded-sm">
                    {product.medias?.[0] && (
                      <img
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={product.medias[0].public_url}
                        alt={product.name}
                      />
                    )}
                    <div className="absolute right-3 top-3 rounded-full bg-surface-container-lowest/90 p-1.5 shadow-sm backdrop-blur">
                      <Heart className="h-4 w-4 fill-primary text-primary" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-headline mb-1 text-base text-on-surface">
                      {product.name}
                    </h3>
                    <p className="mb-3 text-xs text-on-surface-variant">
                      by {organization.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-lg font-bold">
                        {price && `KSh ${(price.price_amount / 100).toLocaleString()}`}
                      </span>
                      <Link href={`/product/${product.id}`}>
                        <button className="group flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                          View{' '}
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
