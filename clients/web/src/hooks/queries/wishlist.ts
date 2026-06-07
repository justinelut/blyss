import { toast } from '@/components/Toast/use-toast'
import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

/**
 * Coerce any backend error shape into a safe display string.
 *
 * FastAPI 422 returns detail as an ARRAY of {type, loc, msg, input}
 * validation errors — passing that to a JSX child blows up React
 * (Minified error #31: 'object with keys {type, loc, msg, input}').
 * Stripe-style errors return detail as a string. Network failures
 * surface error.message. This helper handles all three uniformly so
 * toast({description}) always gets a string.
 */
function formatApiError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const e = error as {
    body?: { detail?: unknown }
    detail?: unknown
    message?: string
  }
  const detail = e.body?.detail ?? e.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation array — pick the first msg.
    const first = detail[0] as { msg?: string } | undefined
    if (first && typeof first.msg === 'string') return first.msg
  }
  if (typeof e.message === 'string') return e.message
  return fallback
}

export const useWishlist = (enabled = true) => {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const result = await api.GET('/v1/wishlist/')

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    retry: defaultRetry,
    // Guests get a 401 on /v1/wishlist; callers pass `authenticated` so
    // the global header / mobile nav don't fire this for anonymous
    // visitors and spam the console. Same pattern as useCart.
    enabled,
  })
}

export const useIsInWishlist = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: ['wishlist', 'check', productId],
    queryFn: async () => {
      const result = await api.GET('/v1/wishlist/check/{product_id}', {
        params: { path: { product_id: productId } },
      })

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    retry: defaultRetry,
    // Only query when we have a product AND the caller says it's allowed
    // (i.e. the visitor is authenticated). Guests would otherwise get a 401
    // on every product view, spamming the console + Sentry.
    enabled: !!productId && enabled,
  })
}

export const useAddToWishlist = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: (productId: string) =>
      api.POST('/v1/wishlist/', {
        body: {
          product_id: productId,
        },
      }),
    onMutate: async (productId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })
      await queryClient.cancelQueries({
        queryKey: ['wishlist', 'check', productId],
      })

      // Snapshot previous values
      const previousWishlist = queryClient.getQueryData(['wishlist'])
      const previousCheck = queryClient.getQueryData([
        'wishlist',
        'check',
        productId,
      ])

      // Optimistically update check status
      queryClient.setQueryData(['wishlist', 'check', productId], {
        is_in_wishlist: true,
      })

      return { previousWishlist, previousCheck }
    },
    onError: (error: any, productId, context) => {
      // Rollback on error
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist)
      }
      if (context?.previousCheck) {
        queryClient.setQueryData(
          ['wishlist', 'check', productId],
          context.previousCheck,
        )
      }

      // Show error toast. FastAPI 422 returns detail as an ARRAY of
      // {type, loc, msg, input} validation errors — passing that to
      // a JSX child blows up React with #31. Coerce to a clean string
      // unconditionally before rendering.
      const errorMessage = formatApiError(
        error,
        'Failed to add to wishlist',
      )
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    },
    onSuccess: (result, productId) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: formatApiError(result.error, 'Failed to add to wishlist'),
          variant: 'error',
        })
        return
      }

      // Invalidate and refetch wishlist
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({
        queryKey: ['wishlist', 'check', productId],
      })

      toast({
        title: 'Success',
        description: 'Added to wishlist',
        variant: 'success',
      })
    },
  })
}

export const useRemoveFromWishlist = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: (productId: string) =>
      api.DELETE('/v1/wishlist/{product_id}', {
        params: { path: { product_id: productId } },
      }),
    onMutate: async (productId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })
      await queryClient.cancelQueries({
        queryKey: ['wishlist', 'check', productId],
      })

      // Snapshot previous values
      const previousWishlist = queryClient.getQueryData(['wishlist'])
      const previousCheck = queryClient.getQueryData([
        'wishlist',
        'check',
        productId,
      ])

      // Optimistically update check status
      queryClient.setQueryData(['wishlist', 'check', productId], {
        is_in_wishlist: false,
      })

      // Optimistically remove from wishlist
      queryClient.setQueryData(['wishlist'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          items:
            old.items?.filter((item: any) => item.product_id !== productId) ||
            [],
        }
      })

      return { previousWishlist, previousCheck }
    },
    onError: (error: any, productId, context) => {
      // Rollback on error
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist)
      }
      if (context?.previousCheck) {
        queryClient.setQueryData(
          ['wishlist', 'check', productId],
          context.previousCheck,
        )
      }

      // Show error toast — coerced to string to avoid React #31.
      const errorMessage = formatApiError(
        error,
        'Failed to remove from wishlist',
      )
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    },
    onSuccess: (result, productId) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: formatApiError(
            result.error,
            'Failed to remove from wishlist',
          ),
          variant: 'error',
        })
        return
      }

      // Invalidate and refetch wishlist
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({
        queryKey: ['wishlist', 'check', productId],
      })

      toast({
        title: 'Success',
        description: 'Removed from wishlist',
        variant: 'success',
      })
    },
  })
}
