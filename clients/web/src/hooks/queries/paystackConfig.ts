import { api } from '@/utils/client'
import { useQuery } from '@tanstack/react-query'

interface PaystackPublicConfigResponse {
  public_key: string
}

/**
 * Fetches the Paystack public key from /v1/integrations/paystack/public-config.
 * Cached for the session — Paystack public keys rotate rarely (per backend
 * deploy / runtime_settings flip), so 5 minutes staleTime is plenty.
 *
 * Public endpoint, no auth required — the key is by definition public.
 */
export const usePaystackPublicKey = (enabled = true) =>
  useQuery({
    queryKey: ['paystack', 'public-config'],
    queryFn: async () => {
      const res = await (api as any).GET(
        '/v1/integrations/paystack/public-config',
      )
      if (res.error) throw res.error
      return res.data as PaystackPublicConfigResponse
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled,
  })
