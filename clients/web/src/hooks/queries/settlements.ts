import { api } from '@/utils/client'
import { useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

/**
 * useSettlements — list a creator organization's Paystack settlement
 * events (the actual `transfer.success` / `.failed` / `.reversed`
 * payloads recorded by the backend webhook handler).
 *
 * Replaces the previous T+2 estimate the dashboard's BlyssPayoutLedger
 * was computing locally. When this hook returns rows, prefer them; when
 * empty (creator hasn't had any settlements yet, or webhook events
 * haven't started arriving on the deployed instance), the ledger can
 * fall back to the order-derived "expected ~T+2" estimate with a clear
 * "estimated" badge.
 *
 * The endpoint is private (auth scoped to org membership) — the hook
 * is only useful inside the dashboard.
 */
export const useSettlements = (
  organizationId?: string,
  parameters?: { page?: number; limit?: number },
) =>
  useQuery({
    queryKey: [
      'paystack-settlements',
      { organizationId, ...(parameters || {}) },
    ],
    queryFn: async (): Promise<SettlementsListResponse> => {
      // The OpenAPI client v1.ts may not yet have this path typed
      // (regenerated on next build). Cast through unknown so the call
      // works regardless of v1.ts staleness, and shape the result
      // manually.
      const result = (await (
        api as unknown as {
          GET: (
            path: string,
            init: { params: { query: Record<string, unknown> } },
          ) => Promise<{
            data?: SettlementsListResponse
            error?: { detail?: string } | null
          }>
        }
      ).GET('/v1/paystack-settlements/', {
        params: {
          query: {
            organization_id: organizationId,
            page: parameters?.page,
            limit: parameters?.limit,
          },
        },
      })) as {
        data?: SettlementsListResponse
        error?: { detail?: string } | null
      }
      if (result?.error) {
        throw new Error(result.error.detail ?? 'Failed to load settlements')
      }
      return (
        result?.data ?? {
          items: [],
          pagination: { total_count: 0, max_page: 1 },
        }
      )
    },
    retry: defaultRetry,
    enabled: !!organizationId,
  })

interface SettlementsListResponse {
  items: PaystackSettlement[]
  pagination: { total_count: number; max_page: number }
}

/**
 * Mirror of the server's PaystackSettlementResponse Pydantic schema.
 * Kept manually until v1.ts is regenerated to include the new path.
 */
export interface PaystackSettlement {
  id: string
  created_at: string
  modified_at: string | null
  organization_id: string | null
  paystack_transfer_id: string
  status: 'pending' | 'success' | 'failed' | 'reversed'
  amount: number
  currency: string
  settled_at: string | null
  recipient_name: string | null
  recipient_account_last4: string | null
}
