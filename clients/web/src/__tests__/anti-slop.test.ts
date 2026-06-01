import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * §3.5 anti-slop gate (plan/04-ui-direction.md).
 *
 * Two layers:
 *  1. detectAntiSlop() unit tests — prove the gate catches each violation and
 *     passes clean code (the demo: seed a gradient → fail; remove → pass).
 *  2. Marketplace-surface scan — enforcement over real components. Files not yet
 *     redesigned (Tasks 8-13) legitimately fail here until rebuilt; that IS the
 *     gate doing its job.
 *
 * ICON RULE (amended per project override): the marketplace surface must NOT
 * import `lucide-react` and must add NO new icon library. We do NOT require
 * Lucide. Icons come from libraries already installed (react-icons, MUI icons).
 */

export interface AntiSlopRule {
  id: string
  test: (content: string) => string | null
}

const STAR_RUN = /★{2,}|(?:★\s*){3,}/
// Real emoji: pictographs, supplemental symbols, dingbats, and emoji presentation
// selector. Deliberately EXCLUDES typographic arrows (U+2190–21FF) and bullets,
// which are legitimate editorial glyphs ("See all →").
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

export const ANTI_SLOP_RULES: AntiSlopRule[] = [
  {
    id: 'no-gradients',
    test: (c) =>
      /\bbg-gradient-to-|\b(?:from|via|to)-\[?#|linear-gradient|radial-gradient|conic-gradient/.test(
        c,
      )
        ? 'gradient detected'
        : null,
  },
  {
    id: 'no-shadow-cards',
    test: (c) =>
      /\bshadow-(?:md|lg|xl|2xl)\b/.test(c) ? 'shadow used for sectioning' : null,
  },
  {
    id: 'no-tailwind-default-grays',
    test: (c) =>
      // solid bg-white only — translucent bg-white/NN glass overlays on dark
      // imagery are a legitimate pattern and are allowed.
      /\bbg-white(?![/\w-])/.test(c)
        ? 'bg-white default'
        : /\btext-gray-\d/.test(c)
          ? 'text-gray-* default'
          : null,
  },
  {
    id: 'no-trust-strips',
    test: (c) =>
      /trusted by|as seen on|as featured in/i.test(c) ? 'trust strip copy' : null,
  },
  {
    id: 'no-generic-section-titles',
    test: (c) =>
      /["'>]\s*(?:Features|Services|Why us|Why choose us|Our benefits)\s*["'<]/i.test(
        c,
      )
        ? 'generic section title'
        : null,
  },
  {
    id: 'no-star-ratings',
    test: (c) => (STAR_RUN.test(c) ? 'star-rating run' : null),
  },
  {
    id: 'no-emoji-icons',
    test: (c) => (EMOJI.test(c) ? 'emoji in source' : null),
  },
  {
    id: 'no-lucide-on-marketplace',
    test: (c) =>
      /from\s+['"]lucide-react['"]/.test(c) ? 'lucide-react import' : null,
  },
]

export function detectAntiSlop(content: string): string[] {
  return ANTI_SLOP_RULES.flatMap((r) => {
    const hit = r.test(content)
    return hit ? [`${r.id}: ${hit}`] : []
  })
}

// ── Layer 1: gate-logic proof against inline fixtures ───────────────────────
describe('anti-slop gate logic (§3.5)', () => {
  test('clean editorial markup passes', () => {
    const clean = `
      <section className="bg-[var(--surface)] text-[var(--text-primary)] py-24">
        <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">What's selling</span>
        <h2 className="font-display">Hand-picked this week</h2>
        <p className="tabular-nums">KSh 1,500</p>
        <span>4.8 · 32 reviews</span>
      </section>`
    expect(detectAntiSlop(clean)).toEqual([])
  })

  test('catches gradient', () => {
    expect(detectAntiSlop('<div className="bg-gradient-to-r from-orange-500" />'))
      .toContain('no-gradients: gradient detected')
  })

  test('catches shadow card', () => {
    expect(detectAntiSlop('<div className="shadow-lg rounded" />')[0]).toMatch(
      /no-shadow-cards/,
    )
  })

  test('catches bg-white / text-gray defaults', () => {
    expect(detectAntiSlop('<p className="bg-white text-gray-500" />')[0]).toMatch(
      /no-tailwind-default-grays/,
    )
  })

  test('catches trust strip and generic titles', () => {
    expect(detectAntiSlop('Trusted by 50+ brands')[0]).toMatch(/no-trust-strips/)
    expect(detectAntiSlop('<h2>Features</h2>')[0]).toMatch(
      /no-generic-section-titles/,
    )
  })

  test('catches star ratings and emoji', () => {
    expect(detectAntiSlop('<span>★★★★★</span>')[0]).toMatch(/no-star-ratings/)
    expect(detectAntiSlop('🚀 Start selling')[0]).toMatch(/no-emoji-icons/)
  })

  test('catches lucide-react import (amended icon rule)', () => {
    expect(detectAntiSlop("import { Search } from 'lucide-react'")[0]).toMatch(
      /no-lucide-on-marketplace/,
    )
  })
})

// ── Layer 2: enforcement scan over the marketplace surface ──────────────────
const SURFACE_DIRS = [
  'src/components/Marketplace',
  'src/components/CreatorStorefront',
  'src/components/ProductDetail',
]

/**
 * Dead legacy components left on disk (no file/dependency removal per project
 * rule) but NOT rendered by any live route — superseded by the redesigned
 * components. Excluded from the live-surface gate. Re-importing any of these
 * into a live route requires removing it here and bringing it to spec.
 */
const LEGACY_EXCLUDED = new Set([
  'src/components/Marketplace/SearchBar.tsx',
  'src/components/Marketplace/FilterSidebar.tsx',
  'src/components/Marketplace/ProductGrid.tsx',
  'src/components/Marketplace/ProductCard.tsx',
  'src/components/Marketplace/CreatorCard.tsx',
  'src/components/Marketplace/HeroSection.tsx',
  'src/components/Marketplace/CurrencyDemo.tsx',
])

function collectFiles(dir: string): string[] {
  const abs = join(process.cwd(), dir)
  const out: string[] = []
  try {
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry)
      if (statSync(full).isDirectory()) out.push(...collectFiles(join(dir, entry)))
      else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes('.test.'))
        out.push(full)
    }
  } catch {
    /* dir may not exist */
  }
  return out
}

describe('anti-slop enforcement — marketplace surface', () => {
  const files = SURFACE_DIRS.flatMap(collectFiles).filter(
    (f) => !LEGACY_EXCLUDED.has(f.replace(process.cwd() + '/', '')),
  )

  test('surface files exist', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const rel = file.replace(process.cwd() + '/', '')
    test(`${rel} passes the §3.5 checklist`, () => {
      const violations = detectAntiSlop(readFileSync(file, 'utf8'))
      expect(violations, violations.join('\n')).toEqual([])
    })
  }
})
