import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Creator country gate — dashboard waitlist routing.
 *
 * Signup + org creation are open worldwide; the AI review is the gate.
 * When the analyzer denies a creator purely because their country isn't
 * enabled yet, it flags the review with denial_kind === 'country'. The
 * dashboard then shows a generic waitlist form instead of the standard
 * "Payment Access Denied" + appeal flow.
 *
 * Locks down:
 *   - AIValidationResult branches on denial_kind === 'country' and
 *     renders CreatorWaitlistForm (not AppealForm) for those denials.
 *   - The waitlist form posts to the org-scoped waitlist endpoint.
 *   - No surface names "Kenya" or implies a Kenya-only platform — the
 *     gate must stay invisible to buyers and generic to creators.
 */

const RESULT_FILE = join(
  process.cwd(),
  'src/components/Organization/AIValidationResult.tsx',
)
const FORM_FILE = join(
  process.cwd(),
  'src/components/Organization/CreatorWaitlistForm.tsx',
)

describe('Creator country gate waitlist', () => {
  const resultSrc = readFileSync(RESULT_FILE, 'utf8')
  const formSrc = readFileSync(FORM_FILE, 'utf8')

  test('AIValidationResult detects a country denial', () => {
    expect(resultSrc).toContain("denial_kind === 'country'")
  })

  test('country denial renders the waitlist form, not the appeal form', () => {
    expect(resultSrc).toContain('CreatorWaitlistForm')
    // The branch must guard the waitlist with isCountryDenial so policy
    // denials keep their appeal flow.
    expect(resultSrc).toContain('isCountryDenial')
  })

  test('waitlist form posts to the org-scoped waitlist endpoint', () => {
    expect(formSrc).toContain('/v1/organizations/{id}/waitlist')
  })

  test('no Kenya-only / region-restriction copy leaks to the UI', () => {
    const combined = (resultSrc + formSrc).toLowerCase()
    expect(combined).not.toContain('kenya')
    expect(combined).not.toContain('kenya-only')
  })

  test('waitlist copy is generic and forward-looking', () => {
    expect(formSrc.toLowerCase()).toContain('region')
    expect(formSrc).toContain('waitlist')
  })
})
