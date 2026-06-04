import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

interface Bank {
  code: string
  name: string
  slug?: string
  longcode?: string
  type?: string
  currency?: string
  country?: string
}

/**
 * Fetches the live list of Paystack-supported banks for Kenya.
 *
 * Used by the bank-payout settings dropdown. Cached for 24h since the
 * Paystack bank list changes infrequently and we don't want to re-fetch
 * on every settings page mount.
 */
export const useBanks = (country: string = 'kenya') => {
  return useQuery({
    queryKey: ['banks', country],
    queryFn: async () => {
      const res = await unwrap(
        (api as any).GET('/v1/integrations/paystack/banks', {
          params: { query: { country } },
        }),
      )
      return (res as Bank[]) || []
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: defaultRetry,
  })
}
