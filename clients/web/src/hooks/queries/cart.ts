import { toast } from '@/components/Toast/use-toast'
import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useCart = (enabled = true) => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => unwrap(api.GET('/v1/cart')),
    retry: defaultRetry,
    // Guests have no cart server-side — querying would 401 on every page
    // (the cart icon is in the global header). Callers pass `authenticated`.
    enabled,
  })
}

export const useCheckoutCart = () => {
  return useMutation({
    mutationFn: () =>
      unwrap((api as any).POST('/v1/cart/checkout')) as Promise<{
        client_secret: string
        url: string
      }>,
    onError: (error: any) => {
      // Same FastAPI-422-array unwrap as useCheckoutCartForOrganization
      // (see comment there). Without this the buyer sees a generic
      // "Failed to start checkout" toast instead of the real reason.
      const rawDetail = error?.body?.detail ?? error?.error?.detail
      const validationDetail = Array.isArray(rawDetail)
        ? rawDetail
            .map((d: { msg?: string }) =>
              typeof d?.msg === 'string' ? d.msg : null,
            )
            .filter((m: string | null): m is string => !!m)
            .join(' · ')
        : null

      const errorMessage =
        validationDetail ||
        (typeof rawDetail === 'string' ? rawDetail : null) ||
        error?.message ||
        'Failed to start checkout'

      toast({
        title: 'Checkout failed',
        description: errorMessage,
        variant: 'error',
      })
    },
  })
}

interface AddToCartParams {
  productId: string
  quantity?: number
}

export const useAddToCart = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: ({ productId, quantity = 1 }: AddToCartParams) =>
      api.POST('/v1/cart/items', {
        body: {
          product_id: productId,
          quantity,
        },
      }),
    onMutate: async ({ productId, quantity = 1 }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] })

      // Snapshot previous value
      const previousCart = queryClient.getQueryData(['cart'])

      // Optimistically update cart count (we don't have full product data for optimistic item addition)
      queryClient.setQueryData(['cart'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          item_count: old.item_count + quantity,
        }
      })

      return { previousCart }
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart)
      }

      // Show error toast
      const errorMessage =
        error?.body?.detail || error?.message || 'Failed to add item to cart'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.detail || 'Failed to add item to cart',
          variant: 'error',
        })
        return
      }

      // Invalidate and refetch cart
      queryClient.invalidateQueries({ queryKey: ['cart'] })

      toast({
        title: 'Success',
        description: 'Item added to cart',
        variant: 'success',
      })
    },
  })
}

interface RemoveFromCartParams {
  itemId: string
}

export const useRemoveFromCart = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: ({ itemId }: RemoveFromCartParams) =>
      api.DELETE('/v1/cart/items/{item_id}', {
        params: { path: { item_id: itemId } },
      }),
    onMutate: async ({ itemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] })

      // Snapshot previous value
      const previousCart = queryClient.getQueryData(['cart'])

      // Optimistically remove item from cart
      queryClient.setQueryData(['cart'], (old: any) => {
        if (!old) return old
        const removedItem = old.items.find((item: any) => item.id === itemId)
        if (!removedItem) return old

        return {
          ...old,
          items: old.items.filter((item: any) => item.id !== itemId),
          item_count: old.item_count - removedItem.quantity,
          subtotal: old.subtotal - removedItem.subtotal,
          // Note: tax and total recalculation would need server data, so we'll refetch
        }
      })

      return { previousCart }
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart)
      }

      // Show error toast
      const errorMessage =
        error?.body?.detail ||
        error?.message ||
        'Failed to remove item from cart'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.detail || 'Failed to remove item from cart',
          variant: 'error',
        })
        return
      }

      // Invalidate and refetch cart to get accurate totals
      queryClient.invalidateQueries({ queryKey: ['cart'] })

      toast({
        title: 'Success',
        description: 'Item removed from cart',
        variant: 'success',
      })
    },
  })
}

export const useClearCart = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: () => api.DELETE('/v1/cart'),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] })

      // Snapshot previous value
      const previousCart = queryClient.getQueryData(['cart'])

      // Optimistically clear cart
      queryClient.setQueryData(['cart'], {
        items: [],
        item_count: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
      })

      return { previousCart }
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart)
      }

      // Show error toast
      const errorMessage =
        error?.body?.detail || error?.message || 'Failed to clear cart'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.detail || 'Failed to clear cart',
          variant: 'error',
        })
        return
      }

      // Invalidate and refetch cart
      queryClient.invalidateQueries({ queryKey: ['cart'] })

      toast({
        title: 'Success',
        description: 'Cart cleared',
        variant: 'success',
      })
    },
  })
}


// ── Multi-creator marketplace cart ──────────────────────────────────
// Polar's transactional model is per-org. The marketplace cart is the
// AGGREGATION of N per-creator carts, each with its own checkout. These
// hooks complement the legacy useCart() flat list above without
// disturbing it.

interface CartGroupOrganization {
  id: string
  slug: string
  name: string
  avatar_url: string | null
}

interface CartGroup {
  organization: CartGroupOrganization
  items: any[]
  subtotal: number
  tax: number
  total: number
  item_count: number
}

interface CartGroupedResponse {
  groups: CartGroup[]
  item_count: number
}

/**
 * Marketplace cart: returns the buyer's items grouped by the creator
 * who owns each product. One section per creator. Sorted most-recently-
 * modified first.
 *
 * Use on marketplace surfaces (homepage / browse / search / /cart page
 * / global header drawer) where the buyer is operating across all
 * creators.
 */
export const useCartGrouped = (enabled = true) =>
  useQuery({
    queryKey: ['cart', 'grouped'],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/cart/grouped'),
      ) as Promise<CartGroupedResponse>,
    retry: defaultRetry,
    enabled,
  })

/**
 * Creator-scoped cart: returns just one creator's slice of the buyer's
 * cart. Same shape as the legacy CartResponse, so the existing
 * presentational components (CartItemRow, etc) reuse unchanged.
 *
 * Use on creator-storefront pages where the buyer should see only this
 * creator's pending items, not other creators' carts.
 */
export const useCartForOrganization = (
  organizationId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ['cart', 'organization', organizationId],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/cart', {
          params: { query: { organization_id: organizationId } },
        }),
      ),
    retry: defaultRetry,
    enabled: enabled && !!organizationId,
  })

/**
 * Checkout one creator's cart slice. Other creators' items remain in
 * the buyer's cart for sequential per-creator checkouts. Pass the
 * organization_id whose section's "Pay" button was pressed.
 */
export const useCheckoutCartForOrganization = () =>
  useMutation({
    mutationFn: (organizationId: string) =>
      unwrap(
        (api as any).POST('/v1/cart/checkout', {
          params: { query: { organization_id: organizationId } },
        }),
      ) as Promise<{ client_secret: string; url: string }>,
    onError: (error: any) => {
      // FastAPI 422 returns `body.detail` as an array of validation
      // entries (`[{loc, msg, type}, ...]`). Without unwrapping it,
      // the toast falls through to the generic "Failed to start
      // checkout" — which is what was reported as a confusing
      // "not found"-looking error when a USD-only product on a
      // KES-only merchant hit the cart. Surface the first .msg so
      // the buyer sees the real reason ("Products are not available
      // in the specified currency.").
      const rawDetail = error?.body?.detail ?? error?.error?.detail
      const validationDetail = Array.isArray(rawDetail)
        ? rawDetail
            .map((d: { msg?: string }) =>
              typeof d?.msg === 'string' ? d.msg : null,
            )
            .filter((m: string | null): m is string => !!m)
            .join(' · ')
        : null

      const errorMessage =
        validationDetail ||
        (typeof rawDetail === 'string' ? rawDetail : null) ||
        error?.message ||
        'Failed to start checkout'

      toast({
        title: 'Checkout failed',
        description: errorMessage,
        variant: 'error',
      })
    },
  })
