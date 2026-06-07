import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

/**
 * Marketplace-level orders aggregator.
 *
 * Hits GET /v1/me/orders — joins users.email = customers.email across
 * every organization and returns the auth'd buyer's orders behind
 * those customer rows. Newest-first.
 *
 * The endpoint is newer than the generated OpenAPI client, so we cast
 * to `any` (same approach as donations / checkoutPaystack hooks).
 */

export interface MeOrderCreator {
  id: string
  name: string
  slug: string
  avatar_url?: string | null
}

export interface MeOrderProduct {
  id: string
  name: string
  thumbnail_url?: string | null
}

export interface MeOrderItem {
  id: string
  status: string
  currency: string
  subtotal_amount: number
  discount_amount: number
  tax_amount: number
  refunded_amount: number
  invoice_number: string
  created_at: string
  modified_at: string | null
  creator: MeOrderCreator
  product: MeOrderProduct | null
}

export interface MeOrdersResponse {
  items: MeOrderItem[]
  pagination: { total_count: number; max_page: number }
}

export const useMyOrders = (
  page = 1,
  limit = 24,
  enabled = true,
) =>
  useQuery({
    queryKey: ['me', 'orders', page, limit],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/me/orders', {
          params: { query: { page, limit } },
        }),
      ) as Promise<MeOrdersResponse>,
    staleTime: 30 * 1000,
    enabled,
  })
