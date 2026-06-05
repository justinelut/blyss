'use client'

import Link from 'next/link'
import { Organization } from '@polar-sh/sdk'
import { FiArrowRight } from 'react-icons/fi'

interface FeaturedSpotlightProps {
  creator: Organization
}

export function FeaturedSpotlight({ creator }: FeaturedSpotlightProps) {
  return (
    <section className="mx-auto mb-24 max-w-7xl px-8">
      <div className="group relative overflow-hidden rounded-xl bg-surface-container-lowest">
        <div className="flex min-h-[500px] flex-col items-stretch lg:flex-row">
          {/* Creator Image */}
          <div className="relative lg:w-3/5">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-container-lowest">
                <span className="text-9xl font-bold text-on-surface-variant">
                  {creator.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Creator Details */}
          <div className="flex flex-col justify-center bg-surface-container-lowest p-12 lg:w-2/5">
            <div className="mb-8 inline-flex w-fit items-center rounded-full bg-tertiary-fixed px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-on-tertiary-fixed">
              Creator of the Week
            </div>

            <h2 className="mb-4 font-headline text-5xl font-bold leading-tight text-on-surface">
              {creator.name}
            </h2>

            {creator.bio && (
              <p className="mb-8 text-lg italic leading-relaxed text-on-surface-variant">
                "{creator.bio}"
              </p>
            )}

            {/* Tags - placeholder for now */}
            <div className="mb-10 flex gap-3">
              <span className="rounded-full bg-surface-container-highest px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Creator
              </span>
            </div>

            <Link
              href={`/creators/${creator.slug}`}
              className="group/btn flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-widest text-on-primary transition-all duration-300 hover:bg-surface-container-lowest hover:text-primary"
            >
              Visit Gallery
              <FiArrowRight className="text-sm transition-transform group-hover/btn:translate-x-1" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
