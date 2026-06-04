import { toast } from '@/components/Toast/use-toast'
import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useCart = () => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => unwrap(api.GET('/v1/cart')),
    retry: defaultRetry,
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
      const errorMessage =
        error?.error?.detail ||
        error?.body?.detail ||
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
