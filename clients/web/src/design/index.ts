/**
 * Blyss design system — public API.
 *
 * Import design primitives via this barrel:
 *
 *   import { BlyssLogo, Eyebrow, SectionDivider, Skeleton, LegalDoc, JsonLd, typography, transitions, variants } from '@/design'
 */

export { BlyssLogo } from './BlyssLogo'
export { Button, buttonVariants, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Eyebrow } from './Eyebrow'
export { SectionDivider } from './SectionDivider'
export { Skeleton } from './Skeleton'
export { LegalDoc } from './LegalDoc'
export { JsonLd } from './JsonLd'
export { ThemeToggle } from './ThemeToggle'
export { PageEnter, StaggerList, StaggerItem, FadeIn } from './PageMotion'
export {
  BlyssDialog,
  BlyssDialogHeader,
  BlyssDialogEyebrow,
  BlyssDialogTitle,
  BlyssDialogBody,
  type BlyssDialogProps,
  type BlyssDialogEyebrowProps,
} from './BlyssDialog'

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
