import { describe, expect, it } from 'vitest'

import { resolveStorefrontModule } from '@/components/CreatorStorefront/modules'
import { STOREFRONT_MODULES } from '@/design/storefront-layouts'

describe('resolveStorefrontModule', () => {
  it('resolves every spec module kind to a registered module', () => {
    for (const m of STOREFRONT_MODULES) {
      const resolved = resolveStorefrontModule(m.kind)
      expect(resolved).not.toBeNull()
      expect(resolved!.kind).toBe(m.kind)
      expect(resolved!.Component).toBeDefined()
    }
  })

  it('returns null for unknown kinds', () => {
    expect(resolveStorefrontModule('ad_block')).toBeNull()
    expect(resolveStorefrontModule('')).toBeNull()
    expect(resolveStorefrontModule('UNKNOWN')).toBeNull()
  })

  it('every module Component is a callable React component', () => {
    for (const m of STOREFRONT_MODULES) {
      const resolved = resolveStorefrontModule(m.kind)
      expect(resolved).not.toBeNull()
      expect(typeof resolved!.Component).toBe('function')
    }
  })
})
