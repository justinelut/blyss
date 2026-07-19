import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Marketplace polish gates.
 *
 * 1. Hero spacing: MarketplaceShell's <main> already adds pt-20 to clear the
 *    fixed h-20 header. The Hero must NOT re-add header-sized top padding
 *    (pt-32/pt-40) on top of that, or a ~240px gap opens between the header
 *    and the hero content.
 * 2. Currency clarity: marketplace price labels must be unambiguous for
 *    international visitors — USD shows "US$", never a bare "$".
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Marketplace polish', () => {
  test('Shell clears the fixed header exactly once (main pt-20)', () => {
    // The pt-20 lives in MarketplaceChrome (the client component that
    // re-evaluates skipChrome on Next.js client-side navigation), not the
    // server-side MarketplaceShell wrapper. Same intent — keep one main
    // with pt-20 to clear the fixed header.
    const chrome = read('src/components/Marketplace/MarketplaceChrome.tsx')
    expect(chrome).toMatch(/<main[^>]*pt-20/)
  })

  test('Hero does not double the header clearance', () => {
    const hero = read('src/components/Marketplace/Hero.tsx')
    // The hero's own top padding must be modest, not header-sized.
    expect(hero).not.toMatch(/lg:pt-40/)
    expect(hero).not.toMatch(/md:pt-32/)
    expect(hero).toMatch(/py-10/)
  })

  test('USD prices are labelled unambiguously (US$, not bare $)', () => {
    for (const f of [
      'src/components/Marketplace/MarketplaceProductCard.tsx',
      'src/components/ProductDetail/ProductInfoColumn.tsx',
      'src/components/Marketplace/FeaturedSubscriptions.tsx',
    ]) {
      const src = read(f)
      expect(src).toMatch(/US\$/)
      // No bare `$${...}` template for USD anymore.
      expect(src).not.toMatch(/'USD'\)\s*return\s*`\$\$\{/)
    }
  })
})

describe('Marketplace locale navigation', () => {
  test('high-traffic buyer links use LocaleLink instead of raw Next links', () => {
    for (const f of [
      'src/components/Marketplace/MarketplaceProductCard.tsx',
      'src/components/Marketplace/MarketplaceHeader.tsx',
      'src/components/Marketplace/Hero.tsx',
      'src/components/Marketplace/MarketplaceCreatorCard.tsx',
    ]) {
      const src = read(f)
      expect(src).toMatch(/import Link from ["']\.\/LocaleLink["']/)
      expect(src).not.toMatch(/import Link from ["']next\/link["']/)
    }
  })
})
