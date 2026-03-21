'use client'

import Link from 'next/link'
import { Organization } from '@polar-sh/sdk'
import { CheckCircle, Star } from 'lucide-react'

interface CreatorCardProps {
  creator: Organization
  offsetClass?: string
}

export function CreatorCard({ creator, offsetClass = '' }: CreatorCardProps) {
  const isVerified = creator.profile_settings?.is_featured || false

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
        </div>

        {/* Creator Info Card */}
        <div className="absolute -bottom-6 left-6 right-6 rounded-lg bg-surface-container-lowest p-6">
          <div className="mb-2 flex items-start justify-between">
            <h4 className="font-headline text-xl font-bold text-on-surface">
              {creator.name}
            </h4>
            {isVerified ? (
              <CheckCircle className="text-secondary" size={18} fill="currentColor" />
            ) : (
              <Star className="text-outline-variant" size={18} fill="currentColor" />
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
