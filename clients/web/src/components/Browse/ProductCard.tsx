'use client'

import { schemas } from '@/lib/api'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'

interface ProductCardProps {
  product: schemas['Product']
}

export function ProductCard({ product }: ProductCardProps) {
  const price = product.prices?.[0]
  const formattedPrice = price
    ? formatCurrency('compact')(price.price_amount, price.price_currency || 'kes')
    : 'Free'

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group bg-surface-container-lowest rounded-xl overflow-hidden transition-all duration-300">
        <div className="relative aspect-4/5 overflow-hidden rounded-lg m-2">
          {product.medias && product.medias.length > 0 && (
            <img
              src={product.medias[0].public_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          )}
          
          {product.is_highlighted && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                New
              </span>
            </div>
          )}
          
          <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-primary p-2.5 rounded-full shadow-lg opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <span className="material-symbols-outlined">shopping_cart</span>
          </button>
        </div>
        
        <div className="p-4 pt-2">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
            {product.type || 'Digital Product'}
          </p>
          <h3 className="text-lg font-bold text-on-surface font-headline leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1 font-body">
            by {product.organization?.name || 'Unknown Creator'}
          </p>
          
          <div className="mt-4 flex items-center justify-between border-t border-outline-variant/10 pt-4">
            <span className="text-xl font-bold text-on-surface tracking-tight">
              {formattedPrice}
            </span>
            <button className="text-primary font-bold text-xs uppercase tracking-widest hover:underline underline-offset-4">
              Quick View
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
