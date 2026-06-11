import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { operations, schemas, unwrap } from '@/lib/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useSubscriptions = (
  organizationId?: string,
  parameters?: Omit<
    NonNullable<operations['subscriptions:list']['parameters']['query']>,
    'organization_id'
  >,
) =>
  useQuery({
    queryKey: ['subscriptions', { organizationId, ...(parameters || {}) }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/subscriptions/', {
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

export const useSubscription = (
  id: string,
  initialData?: schemas['Subscription'],
) =>
  useQuery({
    queryKey: ['subscriptions', { id }],
    queryFn: () =>
      unwrap(api.GET('/v1/subscriptions/{id}', { params: { path: { id } } })),
    retry: defaultRetry,
    initialData,
  })

export const useSubscriptionChargePreview = (id: string) =>
  useQuery({
    queryKey: ['subscriptions', { id }, 'charge-preview'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/subscriptions/{id}/charge-preview', {
          params: { path: { id } },
        }),
      ),
    retry: defaultRetry,
  })

export const useUpdateSubscription = (id: string) =>
  useMutation({
    mutationFn: (body: schemas['SubscriptionUpdate']) => {
      return api.PATCH('/v1/subscriptions/{id}', {
        params: { path: { id } },
        body,
      })
    },
    onSuccess: (result) => {
      const { data, error } = result
      if (error) {
        return
      }
      const queryClient = getQueryClient()
      queryClient.setQueriesData<schemas['Subscription']>(
        {
          queryKey: ['subscriptions', { id }],
        },
        data,
      )
      queryClient.setQueriesData<schemas['ListResource_Subscription_']>(
        {
          queryKey: [
            'subscriptions',
            { organizationId: data.product.organization_id },
          ],
        },
        (old) => {
          if (!old) {
            return {
              items: [data],
              pagination: {
                total_count: 1,
                max_page: 1,
              },
            }
          } else {
            return {
              items: old.items.map((item) =>
                item.id === data.id ? data : item,
              ),
              pagination: old.pagination,
            }
          }
        },
      )

      queryClient.invalidateQueries({
        queryKey: ['subscriptions', { id }, 'charge-preview'],
      })
    },
  })

export const useUncancelSubscription = (id: string) =>
  useMutation({
    mutationFn: () => {
      return api.PATCH('/v1/subscriptions/{id}', {
        params: { path: { id } },
        body: {
          cancel_at_period_end: false,
        },
      })
    },
    onSuccess: (result) => {
      const { data, error } = result
      if (error) {
        return
      }
      const queryClient = getQueryClient()
      queryClient.setQueriesData<schemas['Subscription']>(
        {
          queryKey: ['subscriptions', { id }],
        },
        data,
      )
      queryClient.setQueriesData<schemas['ListResource_Subscription_']>(
        {
          queryKey: [
            'subscriptions',
            { organizationId: data.product.organization_id },
          ],
        },
        (old) => {
          if (!old) {
            return {
              items: [data],
              pagination: {
                total_count: 1,
                max_page: 1,
              },
            }
          } else {
            return {
              items: old.items.map((item) =>
                item.id === data.id ? data : item,
              ),
              pagination: old.pagination,
            }
          }
        },
      )

      queryClient.invalidateQueries({
        queryKey: ['subscriptions', { id }, 'charge-preview'],
      })
    },
  })


/**
 * Returns whether the signed-in user already has an active subscription
 * to a given product. Used by the PDP / SubscriptionsTab to hide the
 * Subscribe CTA and surface a "Manage in portal" affordance instead, so
 * the buyer never crashes into the AlreadyActiveSubscriptionError at
 * confirm time. Anonymous → has_active=false.
 */
export const useActiveSubscriptionForProduct = (
  productId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ['subscriptions', 'me', 'active-for-product', productId],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/subscriptions/me/active-for-product', {
          params: { query: { product_id: productId } },
        }),
      ) as Promise<{
        has_active: boolean
        subscription_id: string | null
        organization_slug: string | null
      }>,
    enabled: enabled && !!productId,
    retry: defaultRetry,
    staleTime: 30 * 1000,
  })
