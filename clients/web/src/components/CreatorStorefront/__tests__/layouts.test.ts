import { describe, expect, it } from 'vitest'

import {
  resolveStorefrontLayout,
} from '@/components/CreatorStorefront/layouts'
import { STOREFRONT_LAYOUTS } from '@/design/storefront-layouts'

describe('resolveStorefrontLayout', () => {
  it('resolves every spec layout slug to a registered layout', () => {
    for (const layout of STOREFRONT_LAYOUTS) {
      const resolved = resolveStorefrontLayout(layout.slug)
      expect(resolved).toBeDefined()
      expect(resolved.slug).toBe(layout.slug)
    }
  })

  it('falls back to editorial for unknown slugs', () => {
    expect(resolveStorefrontLayout('nonexistent').slug).toBe('editorial')
    expect(resolveStorefrontLayout(null).slug).toBe('editorial')
    expect(resolveStorefrontLayout(undefined).slug).toBe('editorial')
    expect(resolveStorefrontLayout('').slug).toBe('editorial')
  })

  it('every resolved layout has a Hero + WorkSection component', () => {
    for (const layout of STOREFRONT_LAYOUTS) {
      const resolved = resolveStorefrontLayout(layout.slug)
      expect(resolved.Hero).toBeDefined()
      expect(typeof resolved.Hero === 'function' ||
        typeof resolved.Hero === 'object').toBe(true)
      expect(resolved.WorkSection).toBeDefined()
      expect(typeof resolved.WorkSection === 'function' ||
        typeof resolved.WorkSection === 'object').toBe(true)
    }
  })
})
