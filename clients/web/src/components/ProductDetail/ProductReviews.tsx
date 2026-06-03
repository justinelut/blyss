'use client'

import { useEffect, useState } from 'react'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import { typography } from '@/design'
import { cn } from '@/lib/utils'

export interface ProductReviewsProps {
  productId: string
}

interface ReviewItem {
  id: string
  rating: number
  review_text: string | null
  user_name: string | null
  user_avatar: string | null
  created_at: string
}

interface Summary {
  product_id: string
  total_reviews: number
  average_rating: number | null
}

/**
 * ProductReviews — fetches and renders real buyer reviews on the PDP.
 *
 * Reads:
 *   GET /v1/reviews/product/{productId}/summary
 *   GET /v1/reviews/product/{productId}?limit=20
 *
 * Editorial layout per §3.4:
 *   - top: numeric average + "X reviews" (no five-star clichés per §15.4)
 *   - list: each review is a stack — rating chip + reviewer + body
 *   - empty: a single sentence explaining the gate ("verified buyers only")
 */
export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [summaryResp, listResp] = await Promise.all([
          unwrap(
            api.GET('/v1/reviews/product/{product_id}/summary', {
              params: { path: { product_id: productId } },
            }),
          ),
          unwrap(
            api.GET('/v1/reviews/product/{product_id}', {
              params: {
                path: { product_id: productId },
                query: { limit: 20, offset: 0 },
              },
            }),
          ),
        ])
        if (cancelled) return
        setSummary(summaryResp as unknown as Summary)
        setItems(listResp as unknown as ReviewItem[])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load reviews')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [productId])

  if (loading) {
    return (
      <div
        className="h-24 w-full max-w-[44ch] animate-pulse rounded-md bg-[var(--surface-sunken)]"
        aria-label="Loading reviews"
      />
    )
  }

  if (error) {
    return (
      <p className="font-sans text-[14px] text-[var(--text-muted)]">
        Reviews unavailable right now.
      </p>
    )
  }

  if (!items.length) {
    return (
      <div className="max-w-[52ch]">
        <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>
          No reviews yet.
        </h3>
        <p className="mt-3 font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
          Only verified buyers can leave a review. Be the first after you
          purchase.
        </p>
      </div>
    )
  }

  const avg =
    summary?.average_rating != null ? summary.average_rating.toFixed(1) : '—'
  const total = summary?.total_reviews ?? items.length

  return (
    <div className="flex flex-col gap-8">
      {/* Aggregate */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[clamp(28px,3vw,40px)] font-semibold leading-none text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
          {avg}
        </span>
        <span className="font-sans text-[14px] text-[var(--text-muted)]">
          {total} {total === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* List */}
      <ul className="flex flex-col gap-8">
        {items.map((r) => (
          <li key={r.id} className="border-t border-[var(--border)] pt-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 min-w-[44px] items-center justify-center rounded-md bg-[var(--surface-sunken)] px-2 font-sans text-[13px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {r.rating} / 5
              </span>
              <span className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
                {r.user_name || 'Verified buyer'}
              </span>
              <span aria-hidden="true" className="text-[var(--border-strong)]">
                ·
              </span>
              <span className="font-sans text-[13px] text-[var(--text-muted)]">
                {new Date(r.created_at).toLocaleDateString('en-KE', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {r.review_text && (
              <p className="mt-3 max-w-[64ch] font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                {r.review_text}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
