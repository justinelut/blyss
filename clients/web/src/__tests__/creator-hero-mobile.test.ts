import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Creator-storefront hero readability gate.
 *
 * History:
 *  - v1 used a fixed 16:9 banner. On desktop that rendered ~1080px tall at
 *    1920px wide, pushing the identity overlay (name / handle / bio / CTAs)
 *    below the fold — visitors landed on a giant banner with no name visible.
 *  - The fix caps the banner to a fixed, viewport-friendly height that scales
 *    by breakpoint, so the overlay is always visible on landing. Mobile keeps
 *    a full-bleed scrim so overlay text stays readable; desktop darkens the
 *    bottom portion only.
 *
 * This gate locks the height-capped behaviour so a future change can't
 * silently regress to an over-tall banner.
 */

const FILE = join(
  process.cwd(),
  'src/components/CreatorStorefront/StorefrontHero.tsx',
)

describe('Creator storefront hero — readability', () => {
  const src = readFileSync(FILE, 'utf8')

  test('Banner height is capped (not full-bleed aspect-ratio)', () => {
    // The banner must NOT use a full-bleed aspect-ratio that blows up on
    // desktop. It uses explicit, breakpoint-scaled heights instead.
    expect(src).not.toMatch(/md:aspect-\[16\/9\]/)
    // Mobile base height + larger desktop cap, all bounded.
    expect(src).toMatch(/h-\[280px\]/)
    expect(src).toMatch(/md:h-\[400px\]/)
  })

  test('Banner desktop cap stays within a single viewport', () => {
    // Largest cap is lg:h-[440px] — comfortably above the fold on laptops.
    expect(src).toMatch(/lg:h-\[440px\]/)
  })

  test('Scrim covers full banner on mobile, partial on md+', () => {
    // h-full on mobile keeps overlay text readable; md+ darkens the lower
    // portion only so the photo subject still shows.
    expect(src).toMatch(/h-full[^"]*md:h-\[60%\]/)
  })

  test('Identity column stacks vertical on mobile, horizontal on md+', () => {
    expect(src).toMatch(/flex-col[^"]*md:flex-row/)
  })

  test('Subscribe CTA is removed from the hero', () => {
    // Per design decision: the Subscribe button no longer lives on the
    // hero — buyers discover tiers via the Subscriptions tab. The hero
    // is reserved for identity (avatar / name / handle / bio + Tip).
    // Asserting the literal '>Subscribe<' text doesn't appear catches
    // accidental re-additions in future PRs.
    expect(src).not.toMatch(/>Subscribe</)
    expect(src).not.toMatch(/onClick=\{onSubscribeClick\}/)
  })

  test('Heading size scales with viewport via clamp()', () => {
    expect(src).toMatch(/clamp\(\s*26px\s*,\s*4vw\s*,\s*48px\s*\)/)
  })
})
