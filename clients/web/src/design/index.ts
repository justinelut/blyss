/**
 * Blyss design system — public API.
 *
 * Import design primitives via this barrel:
 *
 *   import { BlyssLogo, Eyebrow, SectionDivider, Skeleton, JsonLd, typography, transitions, variants } from '@/design'
 *
 * Dependency-heavy primitives (LegalDoc, Button, Input, ThemeToggle, and
 * BlyssDialog) intentionally use direct imports so unrelated SDKs and renderers
 * do not enter every public route through this barrel.
 */

export { BlyssLogo } from "./BlyssLogo";
export { Eyebrow } from "./Eyebrow";
export { SectionDivider } from "./SectionDivider";
export { Skeleton } from "./Skeleton";
export { JsonLd } from "./JsonLd";
export { PageEnter, StaggerList, StaggerItem, FadeIn } from "./PageMotion";

export { typography, type TypographyKey } from "./typography";

export {
  easings,
  durations,
  transitions,
  variants,
  respectReducedMotion,
} from "./motion";
