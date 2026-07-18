'use client'

import Link from '@/components/Marketplace/LocaleLink'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

export interface ReviewSummary {
  /** Mean rating across all this creator's products, on a 1-5 scale. */
  average: number
  /** Total number of reviews aggregated. */
  count: number
}

export interface ReviewExcerpt {
  id: string
  /** Reviewer display name, or an anonymized stand-in if the reviewer
   *  preferred not to publish their name. */
  reviewerName: string
  /** ISO timestamp — formatted client-side. */
  createdAt: string
  /** 1-5 numeric. We render plain numerics, NOT 5-star glyphs (per §15.4). */
  rating: number
  /** The review body — already plain text. We do NOT render markdown here;
   *  reviews are short, plain, untrusted user input. */
  body: string
  /** The product the review was written about. */
  productName: string
  /** Public product id — used to link to the PDP. */
  productId: string
}

export interface ReviewsBlockProps {
  /** The creator's display name — used in copy */
  creatorName: string
  /** Summary across all this creator's products. Pass null for the empty
   *  state until the creator-aggregate review endpoint is wired in phase 7. */
  summary?: ReviewSummary | null
  /** Up to 6 most recent reviews. Empty array renders the empty state. */
  recent: ReviewExcerpt[]
  /** Optional href to the all-reviews page (creator-level). */
  allReviewsHref?: string
}

/**
 * ReviewsBlock — aggregate review count + average + last 6 in 2-col grid.
 *
 * Per plan/07-pages.md §6.4 step 6:
 * - Aggregate review count + average across all products
 * - Last 6 reviews in a 2-col grid
 * - Click "View all reviews" → /creators/[slug]/reviews (handled by parent)
 *
 * Anti-pattern guard (§15.4):
 * - NEVER render 5-star glyphs. Plain numerics: "4.8 · 32 reviews".
 * - No "verified buyer" badges or "Trusted reviews" trust strips.
 *
 * Empty state: editorial copy that points users to the work, no cartoon.
 */
export const ReviewsBlock = ({
  creatorName,
  summary,
  recent,
  allReviewsHref,
}: ReviewsBlockProps) => {
  const hasReviews = !!summary && summary.count > 0 && recent.length > 0

  if (!hasReviews) {
    return (
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
          <Eyebrow>Word from the work</Eyebrow>
          <h2
            className={cn(
              typography.h2,
              'mt-3 max-w-[24ch] text-[var(--text-primary)]',
            )}
          >
            No reviews yet.
          </h2>
          <p
            className={cn(
              'mt-6 max-w-[52ch] font-sans text-[16px] leading-[1.6] text-[var(--text-secondary)]',
            )}
          >
            {creatorName} is just getting started here. Reviews land after the
            first verified purchases — be the first to leave one.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-[var(--surface)]">
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
        {/* Heading + summary line */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow>Word from the work</Eyebrow>
            <h2
              className={cn(
                typography.h2,
                'mt-3 text-[var(--text-primary)]',
              )}
            >
              Reviews of {creatorName}.
            </h2>
            <p className="mt-4 font-display text-[18px] tabular-nums text-[var(--text-primary)]">
              {summary!.average.toFixed(1)}
              <span className="ml-3 font-sans text-[14px] font-normal text-[var(--text-muted)]">
                · {summary!.count.toLocaleString()}{' '}
                {summary!.count === 1 ? 'review' : 'reviews'}
              </span>
            </p>
          </div>
          {allReviewsHref && (
            <Link
              href={allReviewsHref}
              className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
            >
              View all reviews →
            </Link>
          )}
        </div>

        {/* Last 6 reviews — 2-col grid */}
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
          {recent.slice(0, 6).map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ReviewCard({ review }: { review: ReviewExcerpt }) {
  const date = formatReviewDate(review.createdAt)

  return (
    <article
      aria-label={`Review by ${review.reviewerName}`}
      className="flex flex-col gap-3"
    >
      {/* Top row — rating numeric + product link */}
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[16px] font-semibold tabular-nums text-[var(--text-primary)]">
          {review.rating.toFixed(1)}
          <span className="ml-2 font-sans text-[12px] font-normal uppercase tracking-[0.14em] text-[var(--text-muted)]">
            of 5
          </span>
        </p>
        <Link
          href={`/product/${review.productId}`}
          prefetch
          className="font-sans text-[13px] text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
        >
          {review.productName}
        </Link>
      </header>

      {/* Body */}
      <p className="font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
        {review.body}
      </p>

      {/* Reviewer + date */}
      <footer className="font-sans text-[13px] text-[var(--text-muted)]">
        <span className="text-[var(--text-secondary)]">{review.reviewerName}</span>
        {date && (
          <>
            <span aria-hidden="true" className="mx-2">
              ·
            </span>
            <time dateTime={review.createdAt}>{date}</time>
          </>
        )}
      </footer>
    </article>
  )
}

/**
 * Format an ISO timestamp as "Mar 14, 2026" (en-KE locale). Returns empty
 * string if parsing fails so we don't render `Invalid Date`.
 */
function formatReviewDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d.toISOString().slice(0, 10)
  }
}
