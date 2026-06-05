import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Creator categories gate.
 *
 * Categories are backoffice-managed (fetched from /v1/creator-categories) and
 * surfaced as: the /creators directory filter, the settings profile picker,
 * and the onboarding step. Filtering matches a creator's real
 * `creator_category` slug (not the old bio/primary_category heuristic).
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Creator categories', () => {
  test('A hook fetches categories from the public endpoint', () => {
    const hooks = read('src/hooks/queries/creators.ts')
    expect(hooks).toContain('useCreatorCategories')
    expect(hooks).toContain('/v1/creator-categories/')
  })

  test('Directory filters on the real creator_category field', () => {
    const page = read('src/components/Marketplace/CreatorsDirectoryPage.tsx')
    expect(page).toContain('useCreatorCategories')
    expect(page).toMatch(/creator_category/)
    // No longer relies on the bio/primary_category heuristic.
    expect(page).not.toMatch(/primary_category/)
  })

  test('Directory hero renders categories dynamically', () => {
    const hero = read('src/components/Marketplace/CreatorsHero.tsx')
    expect(hero).toMatch(/categories\?:/)
  })

  test('Settings profile editor has a category picker', () => {
    const editor = read('src/components/Organization/ProfileEditor.tsx')
    expect(editor).toContain('useCreatorCategories')
    expect(editor).toMatch(/name="creator_category"/)
  })

  test('Onboarding lets the creator pick a category', () => {
    const onboarding = read('src/components/Onboarding/OrganizationStep.tsx')
    expect(onboarding).toContain('useCreatorCategories')
    expect(onboarding).toMatch(/creator_category/)
  })
})
