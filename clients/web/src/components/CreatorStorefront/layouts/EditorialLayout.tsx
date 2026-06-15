/**
 * EditorialLayout — the Blyss default. Cinematic hero, generous
 * whitespace, magazine typography. v1 baseline.
 *
 * Per plan §19.4.
 */

import { AllWorkTab } from '../AllWorkTab'
import { StorefrontHero } from '../StorefrontHero'
import type { StorefrontLayout } from './index'

export const EditorialLayout: StorefrontLayout = {
  slug: 'editorial',
  Hero: StorefrontHero,
  WorkSection: AllWorkTab,
}
