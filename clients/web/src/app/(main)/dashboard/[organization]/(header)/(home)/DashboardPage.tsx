'use client'

import { OverviewSection } from '@/components/DashboardOverview/OverviewSection'
import { DashboardBody } from '@/components/Layout/DashboardLayout'
import { OnboardingChecklist } from '@/components/Onboarding/OnboardingChecklist'
import { AccountWidget } from '@/components/Widgets/AccountWidget'
import { OrdersWidget } from '@/components/Widgets/OrdersWidget'
import RevenueWidget from '@/components/Widgets/RevenueWidget'
import { useOrganizationPaymentStatus } from '@/hooks/queries'
import { schemas } from '@/lib/api'

const cellClassName =
  'dark:border-polar-700 border-t-0 border-r border-b border-l-0 border-gray-200'

interface OverviewPageProps {
  organization: schemas['Organization']
}

/**
 * Dashboard home for organization owners.
 *
 * Two distinct surfaces, gated by `payment_ready`:
 *
 *  - Pre-ready (new creator): the OnboardingChecklist owns the page.
 *    Analytics widgets stay hidden because they'd render empty and
 *    distract from the actual next step. The previous separate
 *    IncompleteProfileBanner has been folded into the checklist as
 *    its own step ("Complete your profile") so the dashboard shows
 *    ONE consolidated setup card instead of a banner stacked on top
 *    of a checklist.
 *
 *  - Ready (live storefront): analytics overview + Revenue / Orders /
 *    Account widgets. The checklist self-hides once payment_ready
 *    flips true and every step (including the profile step) is
 *    complete.
 *
 * This restores the upstream Polar pattern the user reported missing
 * ("there used to be in the dashbaord not analystics shown until the
 * guided setup completed"). Reference:
 *   ../polar/clients/apps/web/src/app/(main)/dashboard/[organization]/
 *     (header)/(home)/page.tsx + OnboardingChecklistCard.tsx
 */
export default function OverviewPage({ organization }: OverviewPageProps) {
  const { data: paymentStatus, isLoading: paymentStatusLoading } =
    useOrganizationPaymentStatus(organization.id)
  const ready = !!paymentStatus?.payment_ready

  // While the readiness call is in flight, render nothing in the gated
  // region so the dashboard doesn't flash analytics widgets and then
  // collapse to a checklist (or vice versa).
  return (
    <DashboardBody className="gap-y-8 pb-16 md:gap-y-12" title={null}>
      {!paymentStatusLoading && (
        <OnboardingChecklist organization={organization} />
      )}

      {!paymentStatusLoading && ready && (
        <>
          <OverviewSection organization={organization} />

          <div className="dark:border-polar-700 overflow-hidden rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 [clip-path:inset(1px_1px_1px_1px)] lg:grid-cols-3">
              <RevenueWidget className={cellClassName} />
              <OrdersWidget className={cellClassName} />
              <AccountWidget className={cellClassName} />
            </div>
          </div>
        </>
      )}
    </DashboardBody>
  )
}
