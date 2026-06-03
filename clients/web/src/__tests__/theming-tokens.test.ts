import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Theming-tokens gate (plan/04-ui-direction.md §3.2).
 *
 * Bans raw Tailwind `gray-*` utilities on Blyss-owned surfaces. The Tailwind
 * gray ramp is a COOL neutral; the Blyss palette is a WARM paper neutral
 * (`--surface`, `--surface-sunken`, `--border`, `--text-muted/secondary/
 * primary`). When raw gray utilities leak into the surface they fight the
 * paper palette and the page reads as "kinda grey" — exactly the bug this
 * gate exists to prevent.
 *
 * Mapping the bug to: the warm paper-tone tokens already declared in
 * `clients/web/src/styles/globals.css` and `src/design/tokens.css`.
 *
 * Scope: the dashboard, marketplace, customer portal, settings, payouts,
 * finance, layout, and customer surfaces. We deliberately do NOT police
 * `src/components/ui` (shadcn primitives) or `src/components/atoms` (low-
 * level controls); those pass tokens up through `var(--*)` indirections
 * already and changing them risks breaking Polar's upstream component
 * contracts.
 */

const SCOPES = [
  'src/components/Settings',
  'src/components/Payouts',
  'src/components/Finance',
  'src/components/CustomerPortal',
  'src/components/Layout',
  'src/components/Customer',
  'src/components/Marketplace',
  'src/components/CreatorStorefront',
  'src/components/ProductDetail',
]

/**
 * Raw cool-grey utilities that don't belong on Blyss surfaces. We test the
 * full set the offenders actually used historically: bg/text/border/ring/
 * divide, plus the `hover:` and `dark:` variants where they sneak in.
 */
const FORBIDDEN = [
  /\bbg-gray-\d{2,3}\b/,
  /\btext-gray-\d{2,3}\b/,
  /\bborder-gray-\d{2,3}\b/,
  /\bring-gray-\d{2,3}\b/,
  /\bdivide-gray-\d{2,3}\b/,
  /\bhover:bg-gray-\d{2,3}\b/,
  /\bhover:text-gray-\d{2,3}\b/,
  /\bhover:border-gray-\d{2,3}\b/,
  /\bdark:bg-gray-\d{2,3}\b/,
  /\bdark:text-gray-\d{2,3}\b/,
  /\bdark:border-gray-\d{2,3}\b/,
]

/**
 * Files exempted from the gate. Use sparingly — anything here is a known
 * liability the team has agreed to defer.
 *
 * The marketplace legacy set is the same one that is excluded from the
 * forbidden-color gate: dead components left on disk (no file/dependency
 * removal per project rule) but NOT rendered by any live route — superseded
 * by the redesigned components. If any of these is ever re-imported into a
 * live route, delete it from this list and bring it up to spec.
 */
const EXEMPT = new Set<string>([
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
      if (statSync(full).isDirectory()) {
        out.push(...collectFiles(join(dir, entry)))
      } else if (
        /\.(tsx?|jsx?)$/.test(entry) &&
        !entry.includes('.test.') &&
        !entry.includes('.stories.')
      ) {
        out.push(full)
      }
    }
  } catch {
    /* dir may not exist on some checkouts */
  }
  return out
}

describe('Theming-tokens gate — no raw Tailwind grays on Blyss surfaces', () => {
  const root = process.cwd()
  const allFiles = SCOPES.flatMap(collectFiles)

  test('discovered at least one file in each surface scope', () => {
    // Sanity check — if a scope dir gets renamed, this test catches the
    // gate silently going dark.
    for (const scope of SCOPES) {
      const filesInScope = allFiles.filter((f) =>
        f.includes(scope.replace(/\//g, '/')),
      )
      expect(
        filesInScope.length,
        `expected at least one file under ${scope}`,
      ).toBeGreaterThan(0)
    }
  })

  for (const file of allFiles) {
    const rel = file.replace(root + '/', '')
    if (EXEMPT.has(rel)) continue

    test(`${rel} uses Blyss tokens, not raw gray-*`, () => {
      const src = readFileSync(file, 'utf8')
      const offenders: string[] = []

      for (const pattern of FORBIDDEN) {
        const matches = src.match(new RegExp(pattern, 'g'))
        if (matches) offenders.push(...matches)
      }

      expect(
        offenders,
        `${rel} contains raw gray utilities (use Blyss tokens via var(--surface), var(--text-muted), etc. instead): ${[
          ...new Set(offenders),
        ].join(', ')}`,
      ).toEqual([])
    })
  }
})
