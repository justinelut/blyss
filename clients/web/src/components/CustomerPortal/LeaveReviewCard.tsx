'use client'

import { useEffect, useState } from 'react'
import { Client, schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/Toast/use-toast'

export interface LeaveReviewCardProps {
  api: Client
  order: schemas['CustomerOrder']
}

interface ExistingReview {
  id: string
  rating: number
  review_text: string | null
}

/**
 * LeaveReviewCard — inline review submission for buyers, shown on the
 * customer portal order detail page.
 *
 * Behaviour:
 *   - On mount, asks /v1/reviews/me/product/{productId} for the buyer's
 *     existing review on this product. Returns null when none exists.
 *   - If a review exists: render the form pre-populated and submit via
 *     PUT /v1/reviews/{id}. Title flips to "Edit your review".
 *   - If none: render in create mode, submit via POST /v1/reviews/.
 *
 * This replaces the previous create-only flow that would 409 on the
 * unique constraint after a refresh and confused buyers — they want to
 * edit their feedback, not be locked out. The DB still enforces one
 * review per (user, product) so duplicates remain impossible.
 *
 * Visible only when:
 *   - the order has a product
 *   - the order succeeded (anything else is handled by Status above)
 *
 * UX is editorial — typographic rating buttons (no five-star clichés
 * per §15.4) with a single textarea. Per §3.4: surface-sunken bg,
 * hairline borders only on focus, --accent for the active rating.
 */
export const LeaveReviewCard = ({ api, order }: LeaveReviewCardProps) => {
  const [rating, setRating] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<ExistingReview | null>(null)
  const [loadingExisting, setLoadingExisting] = useState<boolean>(true)

  const productId = order.product?.id

  // Fetch the buyer's existing review (if any) once on mount. Falls
  // back to null silently — a missing existing review just means we
  // render in create mode.
  useEffect(() => {
    if (!productId || order.status !== 'paid') {
      setLoadingExisting(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: err } = await (api as unknown as {
          GET: (
            path: string,
            init: { params: { path: { product_id: string } } },
          ) => Promise<{
            data?: ExistingReview | null
            error?: unknown
          }>
        }).GET('/v1/reviews/me/product/{product_id}', {
          params: { path: { product_id: productId } },
        })
        if (cancelled) return
        if (err || !data) {
          setExisting(null)
          return
        }
        setExisting(data)
        setRating(data.rating)
        setReviewText(data.review_text ?? '')
      } catch {
        // Network blip — fall back to create mode.
        if (!cancelled) setExisting(null)
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, productId, order.status])

  if (!order.product || order.status !== 'paid') {
    return null
  }

  if (!productId) return null

  const isEdit = existing !== null

  const handleSubmit = async () => {
    if (rating == null) return
    setSubmitting(true)
    setError(null)
    try {
      let err: unknown
      if (existing) {
        // Edit path: PUT /v1/reviews/{id} with rating + text only.
        const result = await (api as unknown as {
          PUT: (
            path: string,
            init: {
              params: { path: { id: string } }
              body: { rating: number; review_text: string | null }
            },
          ) => Promise<{ error?: unknown }>
        }).PUT('/v1/reviews/{id}', {
          params: { path: { id: existing.id } },
          body: {
            rating,
            review_text: reviewText.trim() || null,
          },
        })
        err = result.error
      } else {
        const result = await api.POST('/v1/reviews/', {
          body: {
            product_id: productId,
            order_id: order.id,
            rating,
            review_text: reviewText.trim() || null,
          },
        })
        err = result.error
      }
      if (err) {
        const detail = (err as { detail?: string | object })?.detail
        const message =
          typeof detail === 'string' ? detail : 'Could not submit your review.'
        setError(message)
        toast({
          title: 'Review failed',
          description: message,
          variant: 'error',
        })
        return
      }
      setSubmitted(true)
      toast({
        title: isEdit ? 'Review updated' : 'Thanks for the review',
        description: isEdit
          ? 'Your changes are live on the storefront.'
          : 'Your feedback helps other buyers find this creator.',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error'
      setError(message)
      toast({
        title: 'Review failed',
        description: message,
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
          {isEdit ? 'Updated — your review is live.' : 'Thanks — your review is in.'}
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
          {isEdit ? 'Edit your review' : 'Leave a review'}
        </h4>
        <p className="mt-1 font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
          {isEdit
            ? `Update what you said about ${order.product?.name}. Your previous review stays live until you save.`
            : `Help other buyers know what to expect from ${order.product?.name}.`}
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
            disabled={loadingExisting}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-md font-sans text-[14px] font-medium transition-colors [font-variant-numeric:tabular-nums]',
              rating === n
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
              loadingExisting && 'cursor-wait opacity-50',
            )}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 font-sans text-[12px] text-[var(--text-muted)]">
          {loadingExisting
            ? 'Loading…'
            : rating == null
              ? 'Pick a rating'
              : `${rating} / 5`}
        </span>
      </div>

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        maxLength={1000}
        disabled={loadingExisting}
        placeholder="What worked, what didn't, who it's for. Optional."
        className="rounded-md bg-[var(--surface-sunken)] p-3 font-sans text-[14px] leading-[1.5] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[12px] text-[var(--text-muted)]">
          {reviewText.length} / 1000
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating == null || submitting || loadingExisting}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-md px-5 font-sans text-[14px] font-medium transition-colors',
            rating != null && !submitting && !loadingExisting
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]'
              : 'cursor-not-allowed bg-[var(--surface-sunken)] text-[var(--text-muted)]',
          )}
          aria-busy={submitting}
        >
          {submitting
            ? isEdit
              ? 'Saving…'
              : 'Submitting…'
            : isEdit
              ? 'Save changes'
              : 'Submit review'}
        </button>
      </div>

      {error && (
        <p className="font-sans text-[13px] text-[var(--danger)]">{error}</p>
      )}
    </div>
  )
}
