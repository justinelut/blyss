'use client'

import { BlyssEmbedCheckout } from '@/components/Checkout/embed'
import type { schemas } from '@/lib/api'
import { useEffect } from 'react'

interface CheckoutEmbedLoadedProps {
  checkout: schemas['CheckoutPublic']
}

const CheckoutEmbedLoaded: React.FC<
  React.PropsWithChildren<CheckoutEmbedLoadedProps>
> = ({ checkout }) => {
  useEffect(() => {
    if (!checkout.embed_origin) {
      return
    }
    BlyssEmbedCheckout.postMessage({ event: 'loaded' }, checkout.embed_origin)
  }, [])

  return null
}

export default CheckoutEmbedLoaded
