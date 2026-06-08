import { useCustomerBenefitGrants } from '@/hooks/queries/customerPortal'
import { Client, schemas } from '@/lib/api'
import { CustomerPortalGrantsComplex } from './CustomerPortalGrantsComplex'
import { CustomerPortalGrantsSimple } from './CustomerPortalGrantsSimple'

const SIMPLIFIED_VIEW_THRESHOLD = 10

export interface CustomerPortalGrantsProps {
  organization?: schemas['CustomerOrganization']
  api: Client
  subscriptionId?: string
  orderId?: string
}

export const CustomerPortalGrants = ({
  organization,
  api,
  subscriptionId,
  orderId,
}: CustomerPortalGrantsProps) => {
  // Build filter parameters based on what's provided
  const filterParams = {
    ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
    ...(orderId ? { order_id: orderId } : {}),
  }

  // Fetch initial data to determine which view to show
  const { data: initialResponse } = useCustomerBenefitGrants(api, {
    limit: SIMPLIFIED_VIEW_THRESHOLD,
    ...filterParams,
  })

  const totalBenefitGrantCount =
    initialResponse?.pagination?.total_count ??
    initialResponse?.items?.length ??
    0
  const initialBenefitGrants = initialResponse?.items ?? []

  const isSimplifiedView = totalBenefitGrantCount <= SIMPLIFIED_VIEW_THRESHOLD

  // Visible empty state instead of a silent `return null`. Buyers
  // who paid for a product expect to see SOMETHING about benefits —
  // even if there are none yet (provisioning lag, no benefits
  // attached at purchase time, customer/grant mismatch, etc).
  // Returning null was hiding the gap entirely; now the buyer
  // gets a clear "your benefits will appear here" affordance.
  if (totalBenefitGrantCount === 0) {
    return (
      <div className="flex flex-col gap-y-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Benefits
        </p>
        <p className="font-display text-[16px] text-[var(--text-primary)]">
          Your benefits will appear here once they&rsquo;re ready.
        </p>
        <p className="font-sans text-[13px] text-[var(--text-secondary)]">
          Downloads, license keys, and access to creator content show
          up automatically after payment is confirmed. If nothing
          appears within a few minutes, the creator may not have
          attached anything to this product yet — feel free to reach
          out to them.
        </p>
      </div>
    )
  }

  return isSimplifiedView ? (
    <CustomerPortalGrantsSimple
      organization={organization}
      benefitGrants={initialBenefitGrants}
      api={api}
    />
  ) : (
    <CustomerPortalGrantsComplex
      api={api}
      subscriptionId={subscriptionId}
      orderId={orderId}
    />
  )
}
