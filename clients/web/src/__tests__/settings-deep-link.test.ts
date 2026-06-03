import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Settings deep-link gate.
 *
 * The Settings > Payouts & M-Pesa screen used to only describe the payout
 * flow without taking the user anywhere — creators read the description and
 * had no way to reach the actual finance/account setup screen.
 *
 * `OrganizationMPesaSettings` now embeds a deep-link banner pointing at
 * `/dashboard/{slug}/finance/account`. This test locks that link in place
 * so future tidy-ups can't silently delete the only navigation between the
 * two surfaces.
 */

const FILE = join(
  process.cwd(),
  'src/components/Settings/OrganizationMPesaSettings.tsx',
)

describe('Settings deep-link to Finance', () => {
  const src = readFileSync(FILE, 'utf8')

  test('imports next/link', () => {
    expect(src).toMatch(/from ['"]next\/link['"]/)
  })

  test('renders a Link to /dashboard/{slug}/finance/account', () => {
    // The href is built from the org slug, so we assert the slug-template
    // shape: `/dashboard/${...slug...}/finance/account`. Loose enough to
    // tolerate either `organization.slug` or `slug` direct, but specific
    // enough that a regression that drops the link won't pass.
    expect(src).toMatch(
      /href=\{`\/dashboard\/\$\{[^}]*slug[^}]*\}\/finance\/account`\}/,
    )
  })

  test('CTA copy points the user toward Finance', () => {
    // The banner copy must clearly tell the user the link is for the *full*
    // payout setup — not yet another duplicate of the M-Pesa-only form.
    expect(src).toMatch(/Finance/)
    expect(src).toMatch(/Set up your full payout account/)
  })

  test('uses Blyss tokens, not raw greys', () => {
    // The banner styling must not introduce raw gray-* utilities — the
    // theming-tokens gate covers this for the file overall, but we want a
    // localised sentinel that the deep-link itself stays on-palette.
    const bannerStart = src.indexOf('Set up your full payout account')
    expect(bannerStart).toBeGreaterThan(0)
    const bannerSlice = src.slice(
      Math.max(0, bannerStart - 800),
      bannerStart + 800,
    )
    expect(bannerSlice).not.toMatch(/\bbg-gray-\d/)
    expect(bannerSlice).not.toMatch(/\btext-gray-\d/)
    expect(bannerSlice).toMatch(/var\(--accent\)/)
  })
})
