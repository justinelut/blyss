import { useProduct } from '@/hooks/queries'
import { useCustomerSubscriptionChargePreview } from '@/hooks/queries/customerPortal'
import { Client, schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { useMemo } from 'react'
import ProductPriceLabel from '../Products/ProductPriceLabel'

interface CurrentPeriodOverviewProps {
  subscription: schemas['CustomerSubscription']
  api: Client
}

export const CurrentPeriodOverview = ({
  subscription,
  api,
}: CurrentPeriodOverviewProps) => {
  const { data: subscriptionPreview } = useCustomerSubscriptionChargePreview(
    api,
    subscription.id,
  )
  const productId = useMemo(() => {
    if (subscription.pending_update && subscription.pending_update.product_id) {
      return subscription.pending_update.product_id
    }
    return subscription.product_id
  }, [subscription])
  const { data: product } = useProduct(productId)

  const isTrialing = subscription.status === 'trialing'
  const isActive = subscription.status === 'active'
  const isCancelingAtPeriodEnd =
    subscription.cancel_at_period_end && !subscription.ended_at

  // Show for active, trialing, or subscriptions set to cancel at period end
  if (!isActive && !isTrialing) {
    return null
  }

  const hasMeters = subscription.meters.length > 0
  const hasTaxes = subscriptionPreview && subscriptionPreview.tax_amount > 0
  const hasDiscount =
    subscriptionPreview && subscriptionPreview.discount_amount > 0

  const isFreeProduct = subscription.prices.some(
    (price) => price.amount_type === 'free',
  )

  // For subscriptions set to cancel, only show if there are meters
  if (isCancelingAtPeriodEnd && !hasMeters) {
    return null
  }

  // Don't show for free subscriptions with no meters
  const hasNextInvoice = !isFreeProduct || hasMeters
  if (!hasNextInvoice) {
    return null
  }

  const chargeDate = isTrialing
    ? subscription.trial_end
    : subscription.current_period_end

  // Determine header and label based on subscription state
  let headerTitle = 'Current Period Overview'
  let dateLabel = 'Next Invoice'

  if (isTrialing) {
    headerTitle = 'First Charge After Trial'
    dateLabel = 'Trial Ends'
  } else if (isCancelingAtPeriodEnd) {
    headerTitle = 'Final Charge'
    dateLabel = 'Subscription Ends'
  }

  return (
    <div className="dark:border-polar-700 flex flex-col gap-4 rounded-3xl border border-[var(--border)] p-8">
      <div className="items-center justify-between space-y-1.5 sm:flex sm:space-y-0">
        <h4 className="text-lg font-medium">{headerTitle}</h4>
        <span className="dark:text-polar-500 text-sm text-[var(--text-muted)]">
          {dateLabel} —{' '}
          {chargeDate
            ? new Date(chargeDate).toLocaleDateString('en-US', {
                dateStyle: 'medium',
              })
            : 'N/A'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {product && subscriptionPreview && (
          <div className="flex items-center justify-between">
            <span className="dark:text-polar-400 text-[var(--text-secondary)]">
              {product.name}
            </span>
            <span
              className={
                isCancelingAtPeriodEnd ? 'text-[var(--text-muted)]' : 'font-medium'
              }
            >
              {isCancelingAtPeriodEnd ? (
                'Canceled'
              ) : (
                <ProductPriceLabel
                  product={product}
                  currency={subscription.currency}
                />
              )}
            </span>
          </div>
        )}

        {hasMeters && (
          <>
            <span className="font-medium">Metered Charges</span>

            {subscription.meters.map((meter) => (
              <div key={meter.id} className="flex items-center justify-between">
                <span className="dark:text-polar-400 text-[var(--text-secondary)]">
                  {meter.meter.name}
                </span>
                <span className="font-medium">
                  {formatCurrency('compact')(
                    meter.amount,
                    subscription.currency,
                  )}
                </span>
              </div>
            ))}
          </>
        )}

        <div className="dark:border-polar-700 mt-2 border-t border-[var(--border)] pt-2">
          {(hasTaxes || hasDiscount) && (
            <div className="dark:text-polar-500 mb-1.5 flex items-center justify-between text-[var(--text-muted)]">
              <span>Subtotal</span>
              <span>
                {formatCurrency('compact')(
                  subscriptionPreview.subtotal_amount,
                  subscription.currency,
                )}
              </span>
            </div>
          )}

          {hasDiscount && (
            <div className="dark:text-polar-500 mb-1 flex items-center justify-between text-[var(--text-muted)]">
              <span>Discount</span>
              <span>
                {formatCurrency('compact')(
                  -1 * subscriptionPreview.discount_amount,
                  subscription.currency,
                )}
              </span>
            </div>
          )}

          {hasTaxes && (
            <div className="dark:text-polar-500 mb-1 flex items-center justify-between text-[var(--text-muted)]">
              <span>Taxes</span>
              <span>
                {formatCurrency('compact')(
                  subscriptionPreview.tax_amount,
                  subscription.currency,
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium">
              {hasMeters ? 'Estimated Total' : 'Total'}
            </span>
            <span className="text-lg font-medium">
              {subscriptionPreview ? (
                formatCurrency('compact')(
                  subscriptionPreview.total_amount,
                  subscription.currency,
                )
              ) : (
                <span className="dark:text-polar-500 animate-pulse text-[var(--text-muted)]">
                  Loading…
                </span>
              )}
            </span>
          </div>

          {isCancelingAtPeriodEnd && (
            <p className="max-w-sm text-xs text-[var(--text-muted)]">
              This will be the final charge before the subscription ends.
              {hasMeters &&
                ' Final amount may vary based on usage until the end of the billing period.'}
            </p>
          )}

          {!isCancelingAtPeriodEnd && hasMeters && (
            <p className="max-w-sm text-xs text-[var(--text-muted)]">
              {isActive
                ? 'Final charges may vary based on usage until the end of the billing period.'
                : isTrialing
                  ? 'Final charges may vary based on usage during the trial period.'
                  : 'Final charges may vary.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
