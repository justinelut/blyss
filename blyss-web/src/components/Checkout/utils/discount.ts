import type { schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import type { AcceptedLocale } from '@/lib/i18n'

type CheckoutDiscount =
  | schemas['CheckoutDiscountPercentageOnceForeverDuration']
  | schemas['CheckoutDiscountFixedOnceForeverDuration']
  | schemas['CheckoutDiscountPercentageRepeatDuration']
  | schemas['CheckoutDiscountFixedRepeatDuration']

const isDiscountFixed = (
  discount: CheckoutDiscount,
): discount is
  | schemas['CheckoutDiscountFixedOnceForeverDuration']
  | schemas['CheckoutDiscountFixedRepeatDuration'] => {
  return discount.type === 'fixed'
}

const isDiscountPercentage = (
  discount: CheckoutDiscount,
): discount is
  | schemas['CheckoutDiscountPercentageOnceForeverDuration']
  | schemas['CheckoutDiscountPercentageRepeatDuration'] => {
  return discount.type === 'percentage'
}

export const getDiscountDisplay = (
  discount: CheckoutDiscount,
  locale?: AcceptedLocale,
): string => {
  if (isDiscountPercentage(discount)) {
    const percentageFormatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 2,
    })
    return percentageFormatter.format(-discount.basis_points / 10000)
  }
  if (isDiscountFixed(discount)) {
    return formatCurrency('compact', locale)(
      -discount.amount,
      discount.currency,
    )
  }
  throw new Error('Unknown discount type')
}
