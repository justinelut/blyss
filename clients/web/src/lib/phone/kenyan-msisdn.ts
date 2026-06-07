/**
 * Kenyan MSISDN normalizer for M-Pesa / Airtel Money payments.
 *
 * Paystack's M-Pesa charge endpoint expects the phone number in
 * E.164 international format WITH the leading '+', as documented:
 *
 *   "When creating the request for M-Pesa, kindly ensure the phone
 *    number is formatted using the country code. For example,
 *    0710000000 should be sent as +254710000000."
 *   — https://docs-v2.paystack.com/docs/payments/payment-channels/#m-pesa
 *
 * Kenyan buyers type their number in many shapes:
 *   "+254 712 345 678"
 *   "+254712345678"
 *   "254712345678"
 *   "0712345678"
 *   "712345678"
 *   "0712 345 678"
 *   "+254-712-345-678"
 *
 * This helper accepts all of the above and produces the canonical
 * `+254XXXXXXXXX` (E.164) form. Returns `null` when the input
 * cannot be reasonably interpreted as a Kenyan mobile number — the
 * caller surfaces a validation error instead of sending Paystack a
 * malformed string.
 *
 * Validation rules:
 *   - After stripping non-digits, the trunk must be exactly 9 digits
 *     starting with 1 (Airtel/Telkom 1XX) or 7 (Safaricom 7XX).
 *   - The country code is normalised to 254.
 *   - Output ALWAYS includes the leading '+'.
 *
 * Examples (all → "+254712345678"):
 *   normalizeKenyanMsisdn("+254 712 345 678")
 *   normalizeKenyanMsisdn("0712345678")
 *   normalizeKenyanMsisdn("712345678")
 */

const KENYAN_PREFIX_RE = /^[17]\d{8}$/

export function normalizeKenyanMsisdn(raw: string): string | null {
  if (!raw) return null
  // Strip every non-digit character. Country-code detection happens
  // afterward via length + prefix.
  const digits = raw.replace(/\D+/g, '')
  if (!digits) return null

  let trunk: string

  // Already in 254XXXXXXXXX form (12 digits) → take last 9 as trunk.
  if (digits.length === 12 && digits.startsWith('254')) {
    trunk = digits.slice(3)
  }
  // 0XXXXXXXXX (10 digits, leading 0) → drop the 0.
  else if (digits.length === 10 && digits.startsWith('0')) {
    trunk = digits.slice(1)
  }
  // Bare 9-digit trunk.
  else if (digits.length === 9) {
    trunk = digits
  }
  // Anything else (international non-KE, too short, too long).
  else {
    return null
  }

  if (!KENYAN_PREFIX_RE.test(trunk)) return null
  return `+254${trunk}`
}

/**
 * Convenience: returns true when the raw string can be normalised
 * into a valid Kenyan MSISDN. Use in form-field gating
 * (`disabled={!isValidKenyanMsisdn(phone)}`) so the Pay button
 * doesn't fire for incomplete inputs.
 */
export function isValidKenyanMsisdn(raw: string): boolean {
  return normalizeKenyanMsisdn(raw) !== null
}
