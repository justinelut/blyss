import { api } from '@/utils/client'
import { act, renderHook } from '@testing-library/react'
import * as fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCartStore } from '../cartStore'

vi.mock('@/utils/client', () => ({
  api: {
    POST: vi.fn(),
    DELETE: vi.fn(),
    GET: vi.fn(),
  },
}))

describe('Cart Store Property Tests', () => {
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

  /**
   * Feature: shopping-cart, Property 26: Cart State Synchronization
   *
   * For any successful cart operation (add, remove, clear),
   * the local cart state should be updated to reflect the change.
   *
   * **Validates: Requirements 9.2**
   */
  describe('Property 26: Cart State Synchronization', () => {
    it('should synchronize state after successful addItem operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 100 }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              product_id: fc.uuid(),
              product: fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              quantity: fc.integer({ min: 1, max: 100 }),
              subtotal: fc.integer({ min: 100, max: 100000 }),
              created_at: fc.date().map((d) => d.toISOString()),
              updated_at: fc.date().map((d) => d.toISOString()),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 0, max: 1000 }),
          async (productId, quantity, items, subtotal, tax) => {
            const total = subtotal + tax
            const itemCount = items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            )

            vi.mocked(api.POST).mockResolvedValue({
              data: items[0],
              error: undefined,
            })
            vi.mocked(api.GET).mockResolvedValue({
              data: { items, subtotal, tax, total, item_count: itemCount },
              error: undefined,
            })

            const { result } = renderHook(() => useCartStore())

            await act(async () => {
              await result.current.addItem(productId, quantity)
            })

            expect(result.current.items).toEqual(items)
            expect(result.current.itemCount).toBe(itemCount)
            expect(result.current.subtotal).toBe(subtotal)
            expect(result.current.tax).toBe(tax)
            expect(result.current.total).toBe(total)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('should synchronize state after successful removeItem operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              product_id: fc.uuid(),
              product: fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              quantity: fc.integer({ min: 1, max: 100 }),
              subtotal: fc.integer({ min: 100, max: 100000 }),
              created_at: fc.date().map((d) => d.toISOString()),
              updated_at: fc.date().map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 0, max: 1000 }),
          async (itemId, items, subtotal, tax) => {
            const total = subtotal + tax
            const itemCount = items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            )

            vi.mocked(api.DELETE).mockResolvedValue({
              data: undefined,
              error: undefined,
            })
            vi.mocked(api.GET).mockResolvedValue({
              data: { items, subtotal, tax, total, item_count: itemCount },
              error: undefined,
            })

            const { result } = renderHook(() => useCartStore())

            await act(async () => {
              await result.current.removeItem(itemId)
            })

            expect(result.current.items).toEqual(items)
            expect(result.current.itemCount).toBe(itemCount)
            expect(result.current.subtotal).toBe(subtotal)
            expect(result.current.tax).toBe(tax)
            expect(result.current.total).toBe(total)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('should synchronize state after successful clearCart operation', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          vi.mocked(api.DELETE).mockResolvedValue({
            data: undefined,
            error: undefined,
          })

          const { result } = renderHook(() => useCartStore())

          await act(async () => {
            await result.current.clearCart()
          })

          expect(result.current.items).toEqual([])
          expect(result.current.itemCount).toBe(0)
          expect(result.current.subtotal).toBe(0)
          expect(result.current.tax).toBe(0)
          expect(result.current.total).toBe(0)
        }),
        { numRuns: 100 },
      )
    })
  })
})
