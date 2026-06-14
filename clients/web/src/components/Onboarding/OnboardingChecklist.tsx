'use client'

/* OnboardingChecklist — first-run dashboard surface for new creators.
 *
 * Modeled on the upstream Polar OnboardingChecklistCard but adapted for
 * Blyss's actual readiness model: M-Pesa subaccount, business details,
 * first product, AI-review verdict. Sources:
 *   ../polar/clients/apps/web/src/app/(main)/dashboard/[organization]/
 *     (header)/(home)/OnboardingChecklistCard.tsx
 *
 * Why this exists:
 * - Before this component, new creators landed on the dashboard and saw
 *   empty Revenue/Orders/Account widgets with no signposting. The user
 *   reported "people signup first time and it doesnt show u will have
 *   to refer to the polar repo" — they wanted the upstream pattern back.
 * - The existing PaymentOnboardingStepper was a stub returning null
 *   (single line: `const PaymentOnboardingStepper = () => null`).
 *
 * UX rules:
 *  1. Show only while payment_ready === false (the API-derived gate
 *     that captures all required steps for a creator to go live).
 *  2. Render every step from the /payment-status endpoint with a tick
 *     for completed and a chevron-link for incomplete. The "next" step
 *     gets the prominent CTA.
 *  3. Progress bar honors the live API response — on every refetch the
 *     stepper updates without a redeploy.
 *  4. Gate sits above the analytics widgets in DashboardPage; the page
 *     hides those widgets entirely until payment_ready.
 *  5. The "Complete your profile" step (bio / avatar / cover) is
 *     prepended client-side. Those fields don't gate payments — the
 *     storefront still works without them — but a creator page with
 *     placeholders kills buyer trust, so it lives in the same checklist
 *     instead of hovering on its own as a separate banner. Hides
 *     itself once all three storefront-critical fields are set.
 *
 * Anti-slop: no emoji icons, no "🚀", no "Get started in 60 seconds"
 * urgency framing, no progress percentages styled as neon. Just a thin
 * border, a tick column, and the step label.
 */

import { useOrganizationPaymentStatus } from '@/hooks/queries'
import { schemas } from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { FiArrowRight, FiCheck, FiClock } from 'react-icons/fi'

interface OnboardingChecklistProps {
  organization: schemas['Organization']
}

/** Map a step id to the dashboard URL the creator should jump to.
 *  Anything unrecognized falls through to /finance/account so the
 *  creator at least lands on a place they can act from.
 *  `integrate_checkout` was dropped server-side (Polar relic — Blyss
 *  is the storefront, creators don't integrate their own checkout)
 *  so it's no longer routed here. */
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
 *  always-complete step. The shape mirrors the server's
 *  PaymentStep schema. */
const buildProfileStep = (
  organization: schemas['Organization'],
):
  | {
      id: 'complete_profile'
      title: string
      description: string
      completed: boolean
    }
  | null => {
  const profileSettings =
    ((organization as unknown as { profile_settings?: { cover_image_url?: string } })
      .profile_settings) ?? {}
  const hasAvatar = !!organization.avatar_url
  const hasBio = !!(
    (organization as unknown as { bio?: string }).bio &&
    String((organization as unknown as { bio?: string }).bio).trim().length > 0
  )
  const hasCover = !!profileSettings.cover_image_url

  // What's missing — ordered most-impactful first.
  const gaps: string[] = []
  if (!hasCover) gaps.push('cover image')
  if (!hasAvatar) gaps.push('logo / avatar')
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

  // Render nothing while loading so the dashboard doesn't flash a stub.
  if (isLoading) return null
  if (!paymentStatus) return null

  // Server-emitted steps drive the payment-readiness gate. Prepend the
  // synthetic profile step so the dashboard shows ONE checklist instead
  // of a banner-plus-checklist split that was reported as visually
  // noisy. The checklist hides itself only when every step (including
  // the synthetic one) is complete AND the org is payment_ready.
  const serverSteps = paymentStatus.steps ?? []
  const profileStep = buildProfileStep(organization)
  const steps = profileStep
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

  // Hide the whole checklist once every step is complete AND the org
  // is payment_ready. The previous behavior (hide on payment_ready
  // alone) caused the checklist to vanish before the creator filled
  // their profile, leaving a half-empty storefront live.
  const allComplete = steps.every((s) => s.completed)
  if (paymentStatus.payment_ready && allComplete) return null

  const completedCount = steps.filter((s) => s.completed).length
  const total = steps.length
  const progressPct = Math.round((completedCount / total) * 100)
  const nextStep = steps.find((s) => !s.completed)

  return (
    <section
      aria-label="Storefront setup checklist"
      className="grid grid-cols-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] lg:grid-cols-[1.1fr_0.9fr]"
    >
      {/* Left — progress + summary */}
      <div className="flex flex-col justify-between gap-5 border-b border-[var(--border)] p-6 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-3">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Storefront setup
          </p>
          <h2 className="font-display text-[22px] font-semibold leading-[1.2] text-[var(--text-primary)]">
            Finish setting up your store
          </h2>
          <p className="max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            Once these are done your shop goes live, payouts unlock, and
            this dashboard switches over to your sales analytics.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
            <span>
              {completedCount} of {total} complete
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

      {/* Right — step list */}
      <ul className="flex flex-col divide-y divide-[var(--border)]">
        {steps.map((step) => {
          const isNext = !step.completed && step === nextStep
          const href = stepHref(organization.slug, step.id)
          return (
            <li key={step.id}>
              <Link
                href={href}
                aria-current={isNext ? 'step' : undefined}
                className={cn(
                  'group flex items-start gap-3 px-6 py-4 transition-colors',
                  step.completed
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
                )}
              >
                {/* Tick column */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    step.completed
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : isNext
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border-strong)] text-[var(--text-muted)]',
                  )}
                >
                  {step.completed ? (
                    <FiCheck size={12} strokeWidth={3} />
                  ) : (
                    <FiClock size={11} strokeWidth={2.5} />
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'font-sans text-[14px] font-medium',
                      step.completed && 'line-through',
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="font-sans text-[13px] text-[var(--text-muted)]">
                      {step.description}
                    </span>
                  )}
                </div>

                {!step.completed && (
                  <FiArrowRight
                    aria-hidden="true"
                    size={14}
                    className={cn(
                      'mt-1 shrink-0 transition-transform',
                      isNext
                        ? 'text-[var(--accent)] group-hover:translate-x-0.5'
                        : 'text-[var(--text-muted)]',
                    )}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
