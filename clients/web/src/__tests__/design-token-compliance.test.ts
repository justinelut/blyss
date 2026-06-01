import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Design-token compliance (plan §3.2).
 *
 * This file owns ONLY the tokens.css palette assertions. The component-surface
 * forbidden-utility scan now lives in (and is owned by) the canonical gates:
 *   - src/__tests__/forbidden-color.test.ts   (palette utilities)
 *   - src/__tests__/anti-slop.test.ts         (§3.5 anti-slop checklist)
 * which use refined matchers (e.g. translucent `bg-white/NN` allowed) and a
 * documented live-surface scope. Keeping the scan in one place avoids stale
 * duplicate matchers flagging the live surface.
 */

describe('tokens.css is light-dominant burnt orange (§3.2)', () => {
  const tokens = readFileSync(
    join(process.cwd(), 'src/design/tokens.css'),
    'utf8',
  )
  const rootStart = tokens.indexOf(':root {')
  const darkStart = tokens.indexOf("[data-theme='dark']", rootStart)
  const rootBlock = tokens.slice(rootStart, darkStart)

  test('light is the :root default with #FAFAF7 background', () => {
    expect(rootBlock).toMatch(/--background:\s*#FAFAF7/i)
  })

  test('default accent is burnt orange #C2410C (not #F97316)', () => {
    expect(rootBlock).toMatch(/--accent:\s*#C2410C/i)
    expect(rootBlock).not.toMatch(/--accent:\s*#F97316/i)
  })

  test('default text-primary is warm near-black, never pure #000000', () => {
    expect(rootBlock).toMatch(/--text-primary:\s*#1A1A17/i)
    expect(rootBlock).not.toMatch(/--text-primary:\s*#000000/i)
  })

  test('dark palette is scoped to opt-in accent selectors', () => {
    expect(tokens).toMatch(/\[data-theme='dark'\],?\s*\n?\s*\.dark/)
    expect(tokens).not.toMatch(/Light mode was deprecated/i)
  })
})
