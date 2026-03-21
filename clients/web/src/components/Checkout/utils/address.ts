import type { schemas } from '@/lib/api'

export const isDisplayedField = (
  mode: schemas['BillingAddressFieldMode'],
): mode is 'required' | 'optional' => {
  return mode === 'required' || mode === 'optional'
}

export const isRequiredField = (
  mode: schemas['BillingAddressFieldMode'],
): mode is 'required' => {
  return mode === 'required'
}
