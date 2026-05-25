import Link from 'next/link'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { typography } from '@/design'

export interface CreatorInlineCardProps {
  name: string
  slug: string
  avatarUrl?: string | null
  bio?: string | null
  productCount?: number
}

/**
 * CreatorInlineCard — surface-sunken block with creator info per §6.5 step 5.
 * The handoff back to the creator's universe.
 */
export const CreatorInlineCard = ({
  name,
  slug,
  avatarUrl,
  bio,
  productCount,
}: CreatorInlineCardProps) => {
  return (
    <div className="rounded-md bg-[var(--surface-sunken)] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface)]">
          <OptimizedImage src={avatarUrl} alt={`${name} avatar`} fill sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>{name}</h3>
          <p className="mt-0.5 font-sans text-[13px] text-[var(--text-muted)]">@{slug}</p>
          {bio && (
            <p className="mt-3 line-clamp-2 font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
              {bio}
            </p>
          )}
          {typeof productCount === 'number' && (
            <p className="mt-2 font-sans text-[13px] tabular-nums text-[var(--text-muted)]">
              {productCount} {productCount === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>
      </div>
      <Link
        href={`/creators/${slug}`}
        prefetch
        className="mt-5 inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[var(--accent)] underline-offset-4 transition-colors hover:underline"
      >
        Visit storefront
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
