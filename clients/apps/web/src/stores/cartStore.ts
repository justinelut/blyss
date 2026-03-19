import { api } from '@/utils/client'
import { ensureSessionToken } from '@/utils/session-token'
import { schemas, unwrap } from '@polar-sh/client'
import { create } from 'zustand'

interface CartItem {
  id: string
  productId: string
  product: schemas['Product']
  quantity: number
  subtotal: number
  createdAt: string
  updatedAt: string
}

interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

interface CartStore {
  items: CartItem[]
  itemCount: number
  subtotal: number
  tax: number
  total: number
  isLoading: boolean
  error: string | null

  addItem: (productId: string, quantity?: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
  isLoading: false,
  error: null,

  addItem: async (productId: string, quantity: number = 1) => {
    set({ isLoading: true, error: null })
    try {
      // Ensure session token exists for guest users
      ensureSessionToken()

      await unwrap(
        api.POST('/v1/cart/items', {
          body: {
            product_id: productId,
            quantity,
          },
        }),
      )

      await get().refreshCart()
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to add item to cart',
      })
    }
  },

  removeItem: async (itemId: string) => {
    set({ isLoading: true, error: null })
    try {
      // Ensure session token exists for guest users
      ensureSessionToken()

      await unwrap(
        api.DELETE('/v1/cart/items/{item_id}', {
          params: { path: { item_id: itemId } },
        }),
      )

      await get().refreshCart()
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to remove item from cart',
      })
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null })
    try {
      // Ensure session token exists for guest users
      ensureSessionToken()

      await unwrap(api.DELETE('/v1/cart'))

      set({
        items: [],
        itemCount: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to clear cart' })
    }
  },

  refreshCart: async () => {
    set({ isLoading: true, error: null })
    try {
      // Ensure session token exists for guest users
      ensureSessionToken()

      const cart = await unwrap(api.GET('/v1/cart'))

      set({
        items: cart.items,
        itemCount: cart.item_count,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch cart' })
    }
  },
}))
