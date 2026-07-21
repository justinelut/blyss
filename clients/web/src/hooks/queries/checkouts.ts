import { api } from '@/utils/client'
import { operations, unwrap } from '@/lib/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from '@/components/Toast/use-toast'
import { defaultRetry } from './retry'
import { useDisplayCurrency } from '@/components/Marketplace/CurrencyProvider'

export const useCheckouts = (
  organizationId: string,
  parameters?: Omit<
    NonNullable<operations['checkouts:list']['parameters']['query']>,
    'organization_id'
  >,
) => {
  return useQuery({
    queryKey: ['checkouts', organizationId, { ...(parameters || {}) }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/checkouts/', {
          params: {
            query: { organization_id: organizationId, ...(parameters || {}) },
          },
        }),
      ),
    retry: defaultRetry,
  })
}

/**
 * Create a hosted checkout session for a SINGLE product and return its
 * client_secret. Used for the PDP "Subscribe" / free-product flow, where
 * the item never goes through the (one-time, multi-product) cart.
 *
 * Subscriptions previously routed to `/checkout?product_id=...`, but the
 * /checkout broker bounced product_id straight back to the PDP — an
 * infinite loop that never created a checkout. This creates the real
 * session so the buyer lands on /checkout/{client_secret}.
 */
export const useCreateProductCheckout = () => {
  const currency = useDisplayCurrency()

  return useMutation({
    mutationFn: (productId: string) =>
      unwrap(
        (api as any).POST('/v1/cart/checkout/product', {
          params: { query: { currency } },
          body: { product_id: productId },
        }),
      ) as Promise<{ client_secret: string; url: string }>,
    onError: (error: any) => {
      const message =
        error?.error?.detail ||
        error?.body?.detail ||
        error?.message ||
        'Could not start checkout'
      toast({
        title: 'Checkout failed',
        description:
          typeof message === 'string' ? message : 'Could not start checkout',
        variant: 'error',
      })
    },
  })
}