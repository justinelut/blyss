/**
 * Storefront layout registry — per plan §19.4.
 *
 * Each layout swaps two things on /creators/{slug}:
 *   - Hero            — the identity introduction at the top of the page
 *   - WorkSection     — how the creator's "All work" grid is presented
 *
 * Everything else (tabs, About, Subscriptions, Reviews, footer) is layout-
 * agnostic and stays in CreatorStorefrontPage. That keeps the layout
 * surface area small and the dispatcher simple.
 *
 * Adding a layout: register its slug in the StorefrontLayoutSlug literal
 * AND add an entry below. The unit test in
 * `clients/web/src/design/__tests__/storefront-layouts.test.ts` enforces
 * that every slug from the spec has a registered renderer.
 */

import type { ComponentType } from 'react'

import { schemas } from '@/lib/api'
import type { StorefrontLayoutSlug } from '@/types/storefront-theme'

import type { AboutTabSocialLinks } from '../AboutTab'

export interface StorefrontHeroProps {
  name: string
  slug: string
  organizationId: string
  bio?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  city?: string | null
  hasSubscriptions?: boolean
  tipEnabled?: boolean
  socials?: AboutTabSocialLinks | null
  onSubscribeClick?: () => void
  onTipClick?: () => void
}

export interface StorefrontWorkSectionProps {
  products: schemas['Product'][]
  creatorName: string
}

export interface StorefrontLayout {
  slug: StorefrontLayoutSlug
  Hero: ComponentType<StorefrontHeroProps>
  WorkSection: ComponentType<StorefrontWorkSectionProps>
}

import { EditorialLayout } from './EditorialLayout'
import { GalleryLayout } from './GalleryLayout'
import { CatalogLayout } from './CatalogLayout'
import { PortfolioLayout } from './PortfolioLayout'
import { StudioLayout } from './StudioLayout'

const REGISTRY: Record<StorefrontLayoutSlug, StorefrontLayout> = {
  editorial: EditorialLayout,
  gallery: GalleryLayout,
  catalog: CatalogLayout,
  portfolio: PortfolioLayout,
  studio: StudioLayout,
}

/**
 * Resolve a layout slug to its renderer. Falls back to editorial when
 * the slug is unknown — defensive against future-only enum values
 * showing up on a deployed older client.
 */
export const resolveStorefrontLayout = (
  slug: StorefrontLayoutSlug | string | null | undefined,
): StorefrontLayout => {
  if (slug && slug in REGISTRY) {
    return REGISTRY[slug as StorefrontLayoutSlug]
  }
  return EditorialLayout
}
