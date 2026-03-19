import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../cartStore'
import { api } from '@/utils/client'

vi.mock('@/utils/client', () => ({
  api: {
    POST: vi.fn(),
    DELETE: vi.fn(),
    GET: vi.fn(),
  },
}))

describe('Cart Store Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { result } = renderHook(() => useCartStore())
    act(() => {
      result.current.items = []
      result.current.itemCount = 0
      result.current.subtotal = 0
      result.current.tax = 0
      result.current.total = 0
      result.current.error = null
    })
  })

  describe('addItem', () => {
    it('should update local state after successful API call', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
      }

      const mockCartItem = {
        id: 'item-123',
        product_id: 'product-123',
        product: mockProduct,
        quantity: 1,
        subtotal: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockCart = {
        items: [mockCartItem],
        subtotal: 1000,
        tax: 100,
        total: 1100,
        item_count: 1,
      }

      vi.mocked(api.POST).mockResolvedValue({ data: mockCartItem, error: undefined })
      vi.mocked(api.GET).mockResolvedValue({ data: mockCart, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.addItem('product-123', 1)
      })

      expect(api.POST).toHaveBeenCalledWith('/v1/cart/items', {
        body: {
          product_id: 'product-123',
          quantity: 1,
        },
      })
      expect(result.current.items).toEqual([mockCartItem])
      expect(result.current.itemCount).toBe(1)
      expect(result.current.subtotal).toBe(1000)
      expect(result.current.tax).toBe(100)
      expect(result.current.total).toBe(1100)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.POST).mockResolvedValue({
        data: undefined,
        error: { detail: 'Product not found' },
      })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.addItem('invalid-product', 1)
      })

      expect(result.current.error).toBe('Product not found')
      expect(result.current.items).toEqual([])
    })
  })

  describe('removeItem', () => {
    it('should update local state after successful API call', async () => {
      const mockCart = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        item_count: 0,
      }

      vi.mocked(api.DELETE).mockResolvedValue({ data: undefined, error: undefined })
      vi.mocked(api.GET).mockResolvedValue({ data: mockCart, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.removeItem('item-123')
      })

      expect(api.DELETE).toHaveBeenCalledWith('/v1/cart/items/{item_id}', {
        params: { path: { item_id: 'item-123' } },
      })
      expect(result.current.items).toEqual([])
      expect(result.current.itemCount).toBe(0)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.DELETE).mockResolvedValue({
        data: undefined,
        error: { detail: 'Cart item not found' },
      })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.removeItem('invalid-item')
      })

      expect(result.current.error).toBe('Cart item not found')
    })
  })

  describe('clearCart', () => {
    it('should update local state after successful API call', async () => {
      vi.mocked(api.DELETE).mockResolvedValue({ data: undefined, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.clearCart()
      })

      expect(api.DELETE).toHaveBeenCalledWith('/v1/cart')
      expect(result.current.items).toEqual([])
      expect(result.current.itemCount).toBe(0)
      expect(result.current.subtotal).toBe(0)
      expect(result.current.tax).toBe(0)
      expect(result.current.total).toBe(0)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.DELETE).mockResolvedValue({
        data: undefined,
        error: { detail: 'Failed to clear cart' },
      })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.clearCart()
      })

      expect(result.current.error).toBe('Failed to clear cart')
    })
  })

  describe('refreshCart', () => {
    it('should fetch current cart from API', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
      }

      const mockCartItem = {
        id: 'item-123',
        product_id: 'product-123',
        product: mockProduct,
        quantity: 2,
        subtotal: 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockCart = {
        items: [mockCartItem],
        subtotal: 2000,
        tax: 200,
        total: 2200,
        item_count: 2,
      }

      vi.mocked(api.GET).mockResolvedValue({ data: mockCart, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.refreshCart()
      })

      expect(api.GET).toHaveBeenCalledWith('/v1/cart')
      expect(result.current.items).toEqual([mockCartItem])
      expect(result.current.itemCount).toBe(2)
      expect(result.current.subtotal).toBe(2000)
      expect(result.current.tax).toBe(200)
      expect(result.current.total).toBe(2200)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.GET).mockResolvedValue({
        data: undefined,
        error: { detail: 'Failed to fetch cart' },
      })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.refreshCart()
      })

      expect(result.current.error).toBe('Failed to fetch cart')
    })
  })

  describe('itemCount calculation', () => {
    it('should correctly calculate item count from cart items', async () => {
      const mockCart = {
        items: [
          {
            id: 'item-1',
            product_id: 'product-1',
            product: { id: 'product-1', name: 'Product 1' },
            quantity: 2,
            subtotal: 2000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'item-2',
            product_id: 'product-2',
            product: { id: 'product-2', name: 'Product 2' },
            quantity: 3,
            subtotal: 3000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        subtotal: 5000,
        tax: 500,
        total: 5500,
        item_count: 5,
      }

      vi.mocked(api.GET).mockResolvedValue({ data: mockCart, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.refreshCart()
      })

      expect(result.current.itemCount).toBe(5)
    })

    it('should return 0 for empty cart', async () => {
      const mockCart = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        item_count: 0,
      }

      vi.mocked(api.GET).mockResolvedValue({ data: mockCart, error: undefined })

      const { result } = renderHook(() => useCartStore())

      await act(async () => {
        await result.current.refreshCart()
      })

      expect(result.current.itemCount).toBe(0)
    })
  })
})
