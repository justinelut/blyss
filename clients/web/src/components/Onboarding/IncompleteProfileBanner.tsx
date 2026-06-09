'use client'

import Link from 'next/link'
import { FiArrowRight, FiCamera, FiUser } from 'react-icons/fi'
import Button from '@/components/atoms/Button'
import { schemas } from '@/lib/api'

interface IncompleteProfileBannerProps {
  organization: schemas['Organization']
}

/**
 * Dashboard banner — surfaces when the creator hasn't filled in
 * the profile fields that drive their public storefront. Without
 * an avatar / bio / cover image the /creators/{slug} page renders
 * with placeholders and looks unfinished, which kills buyer trust.
 *
 * Mirrors PayoutsRequiredBanner's visual chrome (rounded-2xl,
 * --border, --surface, sm:flex-row layout) for consistency. Sits
 * below or alongside other onboarding banners on the dashboard
 * home / products listings.
 *
 * Hides itself when all the storefront-critical fields are set.
 */
export const IncompleteProfileBanner = ({
  organization,
}: IncompleteProfileBannerProps) => {
  const profileSettings = (organization as any).profile_settings ?? {}
  const hasAvatar = !!organization.avatar_url
  const hasBio = !!(
    (organization as any).bio &&
    String((organization as any).bio).trim().length > 0
  )
  const hasCover = !!profileSettings.cover_image_url

  // What's missing — ordered so the most-impactful gap shows first.
  const gaps: string[] = []
  if (!hasCover) gaps.push('cover image')
  if (!hasAvatar) gaps.push('logo / avatar')
  if (!hasBio) gaps.push('bio')

  if (gaps.length === 0) return null

  // Friendly summary copy — "cover image and bio" / "logo, cover
  // image, and bio" / etc.
  const formatList = (items: string[]) => {
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]">
          {!hasAvatar ? (
            <FiUser size={16} aria-hidden="true" />
          ) : (
            <FiCamera size={16} aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
            Finish your storefront
          </p>
          <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
            Add a {formatList(gaps)} so your public creator page reads
            like a real shop. Buyers don&rsquo;t trust unfinished
            stores.
          </p>
        </div>
      </div>
      <Link
        href={`/dashboard/${organization.slug}/settings#organization`}
        className="w-full sm:w-fit"
      >
        <Button
          role="link"
          wrapperClassNames="gap-x-2 sm:w-fit"
          className="w-full"
        >
          <span>Complete profile</span>
          <FiArrowRight size={14} aria-hidden="true" />
        </Button>
      </Link>
    </div>
  )
}
