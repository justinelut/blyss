/**
 * Kenyan MSISDN normalizer for M-Pesa / Airtel Money payments.
 *
 * Paystack's mobile-money charge endpoint expects the phone number in
 * international format WITHOUT the leading `+` — e.g. `254712345678`.
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
 * `254XXXXXXXXX` (12 digits) form. Returns `null` when the input
 * cannot be reasonably interpreted as a Kenyan mobile number — the
 * caller surfaces a validation error instead of sending Paystack a
 * malformed string.
 *
 * Validation rules:
 *   - After stripping non-digits + leading `+`, the number must end
 *     in exactly 9 digits starting with 1 or 7 (Safaricom 7XX,
 *     Airtel/Telkom 1XX).
 *   - The country code is normalised to 254.
 *
 * Examples (all → "254712345678"):
 *   normalizeKenyanMsisdn("+254 712 345 678")
 *   normalizeKenyanMsisdn("0712345678")
 *   normalizeKenyanMsisdn("712345678")
 */

const KENYAN_PREFIX_RE = /^[17]\d{8}$/

export function normalizeKenyanMsisdn(raw: string): string | null {
  if (!raw) return null
  // Strip every character that isn't a digit, EXCEPT keep a leading
  // '+' through the first replace so we can detect international
  // input. Actually simpler: strip everything non-digit, then look at
  // length to infer format.
  const digits = raw.replace(/\D+/g, '')
  if (!digits) return null

  // Already in 254XXXXXXXXX form (12 digits) → strip the country code
  // and validate the trunk.
  if (digits.length === 12 && digits.startsWith('254')) {
    return KENYAN_PREFIX_RE.test(digits.slice(3)) ? digits : null
  }

  // 0XXXXXXXXX (10 digits, leading 0) → drop the 0, prepend 254.
  if (digits.length === 10 && digits.startsWith('0')) {
    const trunk = digits.slice(1)
    return KENYAN_PREFIX_RE.test(trunk) ? `254${trunk}` : null
  }

  // Bare 9-digit trunk (7XXXXXXXX or 1XXXXXXXX).
  if (digits.length === 9) {
    return KENYAN_PREFIX_RE.test(digits) ? `254${digits}` : null
  }

  // Anything else (international non-KE, too short, too long) →
  // bail out so the caller doesn't ship gibberish to Paystack.
  return null
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
