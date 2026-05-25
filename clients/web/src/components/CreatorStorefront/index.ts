/**
 * CreatorStorefront — public surface for /creators/[slug].
 *
 * Spec: plan/07-pages.md §6.4. Tasks: plan/tasks/phase-05-marketplace-pages.md §5.4.
 *
 * Public entry: <CreatorStorefrontPage> (client component). The route's
 * server component fetches creator data + reviews, renders the canonical
 * URL + Person JSON-LD, and hands the props off to this client island.
 */

export { CreatorStorefrontPage } from './CreatorStorefrontPage'
export type { CreatorStorefrontPageProps } from './CreatorStorefrontPage'

export { StorefrontHero } from './StorefrontHero'
export type { StorefrontHeroProps } from './StorefrontHero'

export { StorefrontTabs } from './StorefrontTabs'
export type {
  StorefrontTab,
  StorefrontTabId,
  StorefrontTabsProps,
} from './StorefrontTabs'

export { AllWorkTab } from './AllWorkTab'
export type { AllWorkTabProps } from './AllWorkTab'

export { SubscriptionsTab } from './SubscriptionsTab'
export type { SubscriptionsTabProps } from './SubscriptionsTab'

export { AboutTab } from './AboutTab'
export type { AboutTabProps, AboutTabSocialLinks } from './AboutTab'

export { ReviewsBlock } from './ReviewsBlock'
export type { ReviewsBlockProps, ReviewSummary, ReviewExcerpt } from './ReviewsBlock'
