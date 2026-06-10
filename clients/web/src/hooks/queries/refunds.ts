import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useRefunds = (orderId?: string) =>
  useQuery({
    queryKey: ['refunds', orderId],
    queryFn: async () =>
      unwrap(
        api.GET('/v1/refunds/', { params: { query: { order_id: orderId } } }),
      ),
    enabled: !!orderId,
  })

export const useCreateRefund = () =>
  useMutation({
    mutationFn: async (body: schemas['RefundCreate']) =>
      api.POST('/v1/refunds/', { body }),
    onSuccess: async (result, variables) => {
      if (result.error) {
        return
      }
      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['refunds'],
      })

      queryClient.invalidateQueries({
        queryKey: ['order', variables.order_id],
      })

      queryClient.invalidateQueries({
        queryKey: ['orders'],
      })
    },
    retry: defaultRetry,
  })

/**
 * Paystack-native refund. Blyss runs on Paystack, so refunds go through
 * the Paystack refund API + the order's transaction reference rather than
 * the Stripe-coupled /v1/refunds/ path. Updates the order's refunded
 * amount + status; the refund.processed webhook reconciles the final
 * state.
 */
export const useCreatePaystackRefund = () =>
  useMutation({
    mutationFn: async ({
      orderId,
      amount,
      reason,
    }: {
      orderId: string
      amount?: number
      reason?: string
    }) =>
      (api as any).POST(
        '/v1/integrations/paystack/orders/{order_id}/refund',
        {
          params: { path: { order_id: orderId } },
          body: { amount, reason },
        },
      ),
    onSuccess: async (_result, variables) => {
      const queryClient = getQueryClient()
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    retry: defaultRetry,
  })
