/**
 * Blyss design system — public API.
 *
 * Import design primitives via this barrel:
 *
 *   import { BlyssLogo, Eyebrow, SectionDivider, Skeleton, LegalDoc, JsonLd, typography, transitions, variants } from '@/design'
 */

export { BlyssLogo } from './BlyssLogo'
export { Eyebrow } from './Eyebrow'
export { SectionDivider } from './SectionDivider'
export { Skeleton } from './Skeleton'
export { LegalDoc } from './LegalDoc'
export { JsonLd } from './JsonLd'

export {
  typography,
  type TypographyKey,
} from './typography'

export {
  easings,
  durations,
  transitions,
  variants,
  respectReducedMotion,
} from './motion'
