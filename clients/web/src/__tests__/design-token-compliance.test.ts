import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Design-token usage property test — plan/tasks/phase-09-testing.md §9.2.8.
 *
 * Asserts no marketplace/storefront component uses forbidden Tailwind
 * utilities (blue-*, green-* outside success, purple-*, gradients, shadows
 * for sectioning, bg-white, text-gray-*).
 *
 * These are the §3.5 anti-pattern violations detectable via static analysis.
 */

const FORBIDDEN_PATTERNS = [
  /\btext-blue-\d/,
  /\bbg-blue-\d/,
  /\btext-green-\d/,
  /\bbg-green-\d/,
  /\btext-purple-\d/,
  /\bbg-purple-\d/,
  /\btext-violet-\d/,
  /\bbg-violet-\d/,
  /\btext-indigo-\d/,
  /\bbg-indigo-\d/,
  /\bbg-gradient-to-/,
  /\bbg-white\b/,
  /\btext-gray-\d/,
  /\bshadow-md\b/,
  /\bshadow-lg\b/,
  /\bshadow-xl\b/,
]

const SCAN_DIRS = [
  'src/components/Marketplace',
  'src/components/CreatorStorefront',
  'src/components/ProductDetail',
  'src/components/Cart',
  'src/design',
]

function collectFiles(dir: string): string[] {
  const abs = join(process.cwd(), dir)
  const results: string[] = []
  try {
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        results.push(...collectFiles(join(dir, entry)))
      } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes('.test.')) {
        results.push(full)
      }
    }
  } catch { /* dir doesn't exist yet */ }
  return results
}

describe('Design token compliance (§3.5)', () => {
  const files = SCAN_DIRS.flatMap(collectFiles)

  test('scanned files exist', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const relative = file.replace(process.cwd() + '/', '')

    test(`${relative} has no forbidden utilities`, () => {
      const content = readFileSync(file, 'utf8')
      const violations: string[] = []

      for (const pattern of FORBIDDEN_PATTERNS) {
        const match = content.match(pattern)
        if (match) {
          violations.push(`Found "${match[0]}" (pattern: ${pattern})`)
        }
      }

      expect(violations, violations.join('\n')).toHaveLength(0)
    })
  }
})
