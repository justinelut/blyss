'use client'

import { useState } from 'react'
import { Client, schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/Toast/use-toast'

export interface LeaveReviewCardProps {
  api: Client
  order: schemas['CustomerOrder']
}

/**
 * LeaveReviewCard — inline review submission for buyers, shown on the
 * customer portal order detail page. Posts to the existing /v1/reviews/
 * endpoint (requires verified purchase, which the order satisfies).
 *
 * Visible only when:
 *   - the order has a product
 *   - the order succeeded (anything else is handled by Status above)
 *
 * On success the card switches to a "Thanks" state and stays mounted so
 * the user doesn't lose the panel position.
 *
 * UX is editorial — typographic rating buttons (no five-star clichés per
 * §15.4) with a single textarea. Per §3.4: surface-sunken bg, hairline
 * borders only on focus, --accent for the active rating.
 */
export const LeaveReviewCard = ({ api, order }: LeaveReviewCardProps) => {
  const [rating, setRating] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!order.product || order.status !== 'paid') {
    return null
  }

  const productId = order.product.id

  const handleSubmit = async () => {
    if (rating == null) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await api.POST('/v1/reviews/', {
        body: {
          product_id: productId,
          order_id: order.id,
          rating,
          review_text: reviewText.trim() || null,
        },
      })
      if (err) {
        const detail = (err as { detail?: string | object })?.detail
        const message =
          typeof detail === 'string' ? detail : 'Could not submit your review.'
        setError(message)
        toast({
          title: 'Review failed',
          description: message,
          variant: 'destructive',
        })
        return
      }
      setSubmitted(true)
      toast({
        title: 'Thanks for the review',
        description: 'Your feedback helps other buyers find this creator.',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error'
      setError(message)
      toast({
        title: 'Review failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
          Thanks — your review is in.
        </span>
        <p className="font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
          Buyers reading the storefront will see it next to {order.product?.name}.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <h4 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
          Leave a review
        </h4>
        <p className="mt-1 font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
          Help other buyers know what to expect from {order.product?.name}.
        </p>
      </div>

      {/* Numeric rating row — no star clichés */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} of 5`}
            aria-pressed={rating === n}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-md font-sans text-[14px] font-medium transition-colors [font-variant-numeric:tabular-nums]',
              rating === n
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
            )}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 font-sans text-[12px] text-[var(--text-muted)]">
          {rating == null ? 'Pick a rating' : `${rating} / 5`}
        </span>
      </div>

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What worked, what didn't, who it's for. Optional."
        className="rounded-md bg-[var(--surface-sunken)] p-3 font-sans text-[14px] leading-[1.5] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[12px] text-[var(--text-muted)]">
          {reviewText.length} / 1000
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating == null || submitting}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-md px-5 font-sans text-[14px] font-medium transition-colors',
            rating != null && !submitting
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]'
              : 'cursor-not-allowed bg-[var(--surface-sunken)] text-[var(--text-muted)]',
          )}
          aria-busy={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </div>

      {error && (
        <p className="font-sans text-[13px] text-[var(--danger)]">{error}</p>
      )}
    </div>
  )
}
