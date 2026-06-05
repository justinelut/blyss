'use client'

import Link from 'next/link'
import { Organization } from '@polar-sh/sdk'
import { FiCheckCircle, FiStar } from 'react-icons/fi'
import { FiHeart } from 'react-icons/fi'

interface CreatorCardProps {
  creator: Organization
  offsetClass?: string
  /** When true, shows a small "Tip" affordance that opens the donation modal
   *  without navigating to the storefront. Sourced from the creator's
   *  tipping_enabled flag. */
  tipEnabled?: boolean
  /** Called when the Tip affordance is clicked (opens the shared modal). */
  onTip?: (creator: Organization) => void
}

export function CreatorCard({
  creator,
  offsetClass = '',
  tipEnabled = false,
  onTip,
}: CreatorCardProps) {
  const isVerified = creator.profile_settings?.is_featured || false
  const showTip = tipEnabled && !!onTip

  return (
    <Link
      href={`/creators/${creator.slug}`}
      className={`group cursor-pointer ${offsetClass}`}
    >
      <div className="relative mb-6">
        {/* Creator Avatar */}
        <div className="aspect-[4/5] overflow-hidden rounded-lg bg-surface-container-lowest">
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-container-lowest">
              <span className="text-6xl font-bold text-on-surface-variant">
                {creator.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Tip affordance — icon button overlaid top-right of the avatar.
              Stops navigation so it opens the modal instead of the store. */}
          {showTip && (
            <button
              type="button"
              aria-label={`Tip ${creator.name}`}
              data-testid="creator-card-tip"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTip?.(creator)
              }}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary backdrop-blur-sm transition-colors hover:bg-primary hover:text-surface-container-lowest"
            >
              <FiHeart size={16} />
            </button>
          )}
        </div>

        {/* Creator Info Card */}
        <div className="absolute -bottom-6 left-6 right-6 rounded-lg bg-surface-container-lowest p-6">
          <div className="mb-2 flex items-start justify-between">
            <h4 className="font-headline text-xl font-bold text-on-surface">
              {creator.name}
            </h4>
            {isVerified ? (
              <FiCheckCircle className="text-secondary" size={18} fill="currentColor" />
            ) : (
              <FiStar className="text-outline-variant" size={18} fill="currentColor" />
            )}
          </div>

          <p className="mb-4 line-clamp-1 text-sm text-on-surface-variant">
            {creator.bio || 'Digital creator and artist'}
          </p>

          {/* Tags */}
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-on-tertiary-fixed-variant">
              Creator
            </span>
          </div>

          <button className="w-full rounded-full bg-surface-container-highest py-3 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-surface-container-lowest">
            View Store
          </button>
        </div>
      </div>
    </Link>
  )
}
