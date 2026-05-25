import { BlyssCartPage } from '@/components/Cart/BlyssCartPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your cart · Blyss',
  description: 'Review items in your cart before checkout.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <div className="bg-[var(--background)] pt-20 text-[var(--text-primary)]">
      <BlyssCartPage />
    </div>
  )
}
