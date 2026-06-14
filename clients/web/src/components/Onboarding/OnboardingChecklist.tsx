'use client'

/* OnboardingChecklist — first-run dashboard surface for new creators.
 *
 * Visual pattern is a direct port of the upstream Polar
 * OnboardingChecklistCard (../polar/clients/apps/web/src/app/(main)/
 * dashboard/[organization]/(header)/(home)/OnboardingChecklistCard.tsx)
 * with Blyss design tokens substituted in for the Orbit primitives.
 * Two-column card:
 *
 *   ┌─────────────────────────────────┬─────────────────────────────┐
 *   │ ● Finish setting up your store  │ Up next                     │
 *   │ short description               │ Complete your profile       │
 *   │                                 │ short reason this matters   │
 *   │ N of M complete                 │                             │
 *   │ ▓▓▓▓░░░░░░░░░░░░░░ X%           │            [Continue setup] │
 *   └─────────────────────────────────┴─────────────────────────────┘
 *
 * Single "next step" surface on the right — the previous Blyss build
 * listed every step which the user reported as visually noisy ("copy
 * the exact design of polar"). The DATA layer is unchanged: server
 * /payment-status drives create_product + setup_account; we prepend a
 * synthetic complete_profile step from organization fields. Same
 * stable-id contract used by stepHref.
 *
 * Hide condition: every step complete AND payment_ready=true. We
 * still mount when payment_ready is true but a step is incomplete, so
 * a creator who skipped the profile fields keeps seeing the nudge
 * even after their store goes live.
 *
 * Anti-slop: no neon CTA, no drop-shadow, no gradient. Single hairline
 * border, single 8px progress bar filled with --accent. Inter
 * Display for the headline, Inter for body — matches every other
 * Blyss surface.
 */

import { useOrganizationPaymentStatus } from '@/hooks/queries'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { FiArrowRight, FiCheck } from 'react-icons/fi'

interface OnboardingChecklistProps {
  organization: schemas['Organization']
}

interface ChecklistStep {
  id: string
  title: string
  description: string
  completed: boolean
}

/** Map a step id to the dashboard URL the creator should jump to.
 *  Anything unrecognized falls through to /finance/account. */
const stepHref = (orgSlug: string, stepId: string): string => {
  const base = `/dashboard/${orgSlug}`
  switch (stepId) {
    case 'add_product':
    case 'create_product':
      return `${base}/products/new`
    case 'setup_account':
    case 'mpesa_setup':
      return `${base}/finance/account`
    case 'submit_details':
    case 'complete_profile':
      return `${base}/settings#organization`
    default:
      return `${base}/finance/account`
  }
}

/** Build the synthetic "Complete your profile" step from the org's
 *  storefront fields (avatar, bio, cover image). Returns null when
 *  every field is set so the checklist doesn't render an
 *  always-complete entry. */
const buildProfileStep = (
  organization: schemas['Organization'],
): ChecklistStep | null => {
  const profileSettings =
    ((organization as unknown as { profile_settings?: { cover_image_url?: string } })
      .profile_settings) ?? {}
  const hasAvatar = !!organization.avatar_url
  const hasBio = !!(
    (organization as unknown as { bio?: string }).bio &&
    String((organization as unknown as { bio?: string }).bio).trim().length > 0
  )
  const hasCover = !!profileSettings.cover_image_url

  const gaps: string[] = []
  if (!hasCover) gaps.push('cover image')
  if (!hasAvatar) gaps.push('logo')
  if (!hasBio) gaps.push('bio')

  if (gaps.length === 0) return null

  const formatList = (items: string[]) => {
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
  }

  return {
    id: 'complete_profile',
    title: 'Complete your profile',
    description: `Add a ${formatList(gaps)} so your public creator page reads like a real shop.`,
    completed: false,
  }
}

export const OnboardingChecklist = ({
  organization,
}: OnboardingChecklistProps) => {
  const { data: paymentStatus, isLoading } = useOrganizationPaymentStatus(
    organization.id,
  )

  if (isLoading) return null
  if (!paymentStatus) return null

  const serverSteps = paymentStatus.steps ?? []
  const profileStep = buildProfileStep(organization)
  const steps: ChecklistStep[] = profileStep
    ? [
        profileStep,
        ...serverSteps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          completed: s.completed,
        })),
      ]
    : serverSteps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        completed: s.completed,
      }))

  if (steps.length === 0) return null

  const completed = steps.filter((s) => s.completed).length
  const total = steps.length
  const progressPct = Math.round((completed / total) * 100)
  const nextStep = steps.find((s) => !s.completed)
  const allComplete = nextStep === undefined

  // Hide the whole card once every step is complete AND the org is
  // payment_ready. Without the second clause the card vanishes the
  // instant a creator finishes the server-side steps but skipped the
  // profile fields, which leaves them with a half-empty live storefront.
  if (paymentStatus.payment_ready && allComplete) return null

  const nextHref = nextStep
    ? stepHref(organization.slug, nextStep.id)
    : `/dashboard/${organization.slug}/finance/account`

  return (
    <section
      aria-label="Storefront setup"
      className="grid grid-cols-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] lg:grid-cols-2"
    >
      {/* Left column — title, description, progress */}
      <div className="flex flex-col justify-center gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Discreet accent dot — anti-emoji alternative to the
                lucide rocket Polar uses. Keeps the visual rhythm
                without a borrowed icon. */}
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
            />
            <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Finish setting up your store
            </h2>
          </div>
          <p className="font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            Once these are done your shop goes live, payouts unlock,
            and this dashboard switches over to your sales analytics.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
            <span>
              {completed} of {total} complete
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right column — up-next step + CTA */}
      <div
        className={cn(
          'flex flex-col justify-between gap-6 p-6 md:p-8',
          // Border seam: top on mobile (stacked), left on lg+ (side by side)
          'border-t border-[var(--border)] lg:border-t-0 lg:border-l',
        )}
      >
        <div className="flex flex-col gap-2">
          {nextStep ? (
            <>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Up next
              </p>
              <h3 className="font-display text-[18px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)]">
                {nextStep.title}
              </h3>
              {nextStep.description && (
                <p className="font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                  {nextStep.description}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                You&rsquo;re ready
              </p>
              <h3 className="font-display text-[18px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-primary)]">
                Every step is complete.
              </h3>
              <p className="font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                Your storefront is live. Buyers can find you on the
                marketplace and check out with M-Pesa or card.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Link
            href={nextHref}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            {allComplete ? (
              <>
                Open finance
                <FiArrowRight aria-hidden="true" size={14} />
              </>
            ) : (
              <>
                Continue setup
                <FiArrowRight aria-hidden="true" size={14} />
              </>
            )}
          </Link>
        </div>

        {/* Compact summary of the remaining steps so the creator
            knows what comes after the up-next item. Keeps the card
            single-pane like Polar's but tells the truth about the
            full pipeline. Each row is plain text — no nested CTAs —
            so the right-column button stays the only action. */}
        {nextStep && steps.length > 1 && (
          <ul className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-4">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center gap-2 font-sans text-[12px] text-[var(--text-muted)]"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                    step.completed
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : step === nextStep
                        ? 'border border-[var(--accent)] text-[var(--accent)]'
                        : 'border border-[var(--border-strong)]',
                  )}
                >
                  {step.completed && <FiCheck size={9} strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    step.completed && 'line-through',
                    step === nextStep && 'text-[var(--text-primary)]',
                  )}
                >
                  {step.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
