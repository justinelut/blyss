import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export const EmptyCart = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-md bg-[var(--color-surface-container-lowest)] p-16 shadow-[var(--shadow-editorial)]">
      <div className="text-[var(--color-on-surface-variant)]">
        <ShoppingCart className="h-20 w-20" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-epilogue text-xl font-semibold text-[var(--color-on-surface)]">
          Your cart is empty
        </h3>
        <p className="font-inter text-[var(--color-on-surface-variant)]">
          Add some products to get started
        </p>
      </div>
      <Link href="/products">
        <Button variant="default" size="lg" className="font-inter">
          Browse Products
        </Button>
      </Link>
    </div>
  )
}
