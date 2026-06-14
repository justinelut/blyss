import { api } from '@/utils/client'
import { useQuery } from '@tanstack/react-query'

interface PaystackPublicConfigResponse {
  public_key: string
  /** Lowercase ISO-4217 codes the merchant's Paystack account can charge.
   *  Defaults to ['kes'] until USD (or another currency) is enabled on the
   *  Paystack dashboard AND PAYSTACK_SUPPORTED_CURRENCIES is updated in
   *  the backend deploy env. The product currency picker filters its
   *  options against this so creators can't add a price the merchant
   *  can't actually charge. */
  supported_currencies: string[]
}

/**
 * Fetches Paystack runtime config from /v1/integrations/paystack/public-config:
 *   - public_key for the buyer-side popup
 *   - supported_currencies for the creator-side product currency picker
 *
 * Cached for 5 minutes — both values change rarely (per backend deploy
 * or runtime_settings flip).
 *
 * Public endpoint, no auth required — only ships values that are safe
 * to expose to anonymous visitors.
 */
export const usePaystackPublicKey = (enabled = true) =>
  useQuery({
    queryKey: ['paystack', 'public-config'],
    queryFn: async () => {
      const res = await (api as any).GET(
        '/v1/integrations/paystack/public-config',
      )
      if (res.error) throw res.error
      const data = res.data as Partial<PaystackPublicConfigResponse>
      return {
        public_key: data.public_key ?? '',
        // Defensive default: if the backend response is missing the field
        // (older deploy still serving the previous shape), assume KES-only
        // so the picker stays in lock-step with the actual server clamp.
        supported_currencies:
          data.supported_currencies && data.supported_currencies.length > 0
            ? data.supported_currencies.map((c) => c.toLowerCase())
            : ['kes'],
      } satisfies PaystackPublicConfigResponse
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled,
  })

/**
 * Hook variant that returns just the merchant-supported currency list
 * for surfaces that don't need the public key (the product currency
 * picker, for example). Falls back to ['kes'] while the request is in
 * flight so the picker doesn't briefly flash the full 37-currency list.
 */
export const useMerchantSupportedCurrencies = (): string[] => {
  const { data } = usePaystackPublicKey()
  return data?.supported_currencies ?? ['kes']
}
