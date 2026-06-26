import { describe, test, expect } from 'vitest'
import {
  getCategoryIntro,
  CATEGORY_INTRO_SLUGS,
} from '../seo/category-copy'

/**
 * Curated category SEO copy — keyword targets are drawn from
 * 2026-06-26 autocomplete research. Tests guard against:
 *
 *   - Slugs drifting from the backend (CATEGORY_INTRO_SLUGS must
 *     stay in lockstep with `product_categories.slug`)
 *   - AI-slop words sneaking into copy
 *   - Long-form bodies shrinking below the minimum that makes Google
 *     bother to read them
 */

describe('getCategoryIntro', () => {
  test('returns null for unknown slugs', () => {
    expect(getCategoryIntro('nonexistent-category')).toBeNull()
  })

  test.each(CATEGORY_INTRO_SLUGS)(
    'returns a fully-populated intro for known slug %s',
    (slug) => {
      const intro = getCategoryIntro(slug)
      expect(intro).not.toBeNull()
      if (!intro) return
      expect(intro.title.length).toBeGreaterThan(20)
      expect(intro.description.length).toBeGreaterThan(80)
      expect(intro.description.length).toBeLessThan(200) // meta-desc soft cap
      expect(intro.keywords.length).toBeGreaterThan(40)
      // Must have at least 2 body paragraphs for SEO weight
      expect(intro.paragraphs.length).toBeGreaterThanOrEqual(2)
      // Total body length over 300 chars — enough to give Google
      // something to rank
      const total = intro.paragraphs.join('').length
      expect(total).toBeGreaterThan(300)
    },
  )

  test('all introductions are free of AI-slop words', () => {
    // Words flagged by .kiro/skills/anti-slop-writing as 'AI tells'.
    // The skill calls these out as the words generative models reach
    // for when they don't have anything concrete to say.
    const slopWords = [
      'seamless',
      'powerful',
      'unleash',
      'cutting-edge',
      'state-of-the-art',
      'transform your',
      'revolutionize',
      'best-in-class',
      'world-class',
      'next-generation',
    ]
    for (const slug of CATEGORY_INTRO_SLUGS) {
      const intro = getCategoryIntro(slug)
      if (!intro) continue
      const haystack = [
        intro.title,
        intro.description,
        intro.heading,
        ...intro.paragraphs,
        ...(intro.bullets ?? []),
      ]
        .join(' ')
        .toLowerCase()
      for (const slop of slopWords) {
        expect(
          haystack.includes(slop),
          `category '${slug}' contains AI-slop word '${slop}'`,
        ).toBe(false)
      }
    }
  })

  test('all categories include the concrete-payment phrase', () => {
    // Per anti-slop: every body should anchor on a concrete fact —
    // for Blyss that's M-Pesa or KES. We sample bullets/paragraphs
    // and require either M-Pesa, KES, or a price-rail keyword.
    for (const slug of CATEGORY_INTRO_SLUGS) {
      const intro = getCategoryIntro(slug)
      if (!intro) continue
      const text = [intro.description, ...intro.paragraphs]
        .join(' ')
        .toLowerCase()
      const hasConcrete =
        text.includes('m-pesa') ||
        text.includes('mpesa') ||
        text.includes('kes') ||
        text.includes('visa') ||
        text.includes('mastercard') ||
        text.includes('licence') ||
        text.includes('license') ||
        text.includes('instant download')
      expect(
        hasConcrete,
        `category '${slug}' has no concrete payment/licence/download anchor`,
      ).toBe(true)
    }
  })

  test('slugs match expected canonical set', () => {
    // If new category copy is added, this test fails — update both
    // here AND `clients/web/src/app/sitemap.ts` (which iterates over
    // CATEGORY_INTRO_SLUGS) AND make sure the backend has a matching
    // ProductCategory row.
    expect(new Set(CATEGORY_INTRO_SLUGS)).toEqual(
      new Set([
        'notion-templates',
        'lightroom-presets',
        'ebooks',
        'beats',
        'courses',
        'canva-templates',
        'fonts',
        'stock-music',
      ]),
    )
  })
})
