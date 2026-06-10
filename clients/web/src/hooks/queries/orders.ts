import { api } from '@/utils/client'
import { operations, schemas, unwrap } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useOrder = (id: string, initialData?: schemas['Order']) =>
  useQuery({
    queryKey: ['orders', { id }],
    queryFn: () =>
      unwrap(api.GET('/v1/orders/{id}', { params: { path: { id } } })),
    retry: defaultRetry,
    initialData,
  })

export const useOrders = (
  organizationId?: string,
  parameters?: Omit<
    NonNullable<operations['orders:list']['parameters']['query']>,
    'organization_id'
  >,
) =>
  useQuery({
    queryKey: ['orders', { organizationId, ...(parameters || {}) }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/orders/', {
          params: {
            query: {
              organization_id: organizationId,
              ...parameters,
            },
          },
        }),
      ),
    retry: defaultRetry,
    enabled: !!organizationId,
  })

export interface OrderEarningsSummary {
  gross_amount: number
  platform_fee_amount: number
  refunded_amount: number
  net_amount: number
  orders_count: number
  currency: string
}

/**
 * Lifetime creator earnings for an organization — total take-home (after
 * the marketplace fee + refunds), gross, fees, and order count. Powers the
 * income page so creators see what they've actually earned.
 */
export const useEarningsSummary = (organizationId?: string) =>
  useQuery({
    queryKey: ['orders', 'earnings-summary', { organizationId }],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/orders/earnings-summary', {
          params: { query: { organization_id: organizationId } },
        }),
      ) as Promise<OrderEarningsSummary>,
    retry: defaultRetry,
    enabled: !!organizationId,
  })
