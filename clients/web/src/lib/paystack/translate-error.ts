/**
 * Translate Paystack mobile-money / card gateway responses into buyer-friendly
 * English. Paystack returns raw upstream codes like "DS timeout user cannot
 * be reached" or "Insufficient funds in customer account" that we don't want
 * to surface verbatim — they read like a developer's stack trace.
 *
 * Falls back to a polite generic message when we don't recognise the code,
 * never returning the raw paystack string. If you spot a new code in
 * production logs, add it here so the buyer + creator both see something
 * useful.
 *
 * Used by:
 *   - Dashboard: OrganizationMPesaSettings (creator's KSh 100 verification)
 *   - Checkout : PaystackPaymentInterface (buyer's order payment)
 */
export function translatePaystackError(raw: string | null | undefined): string {
  if (!raw) return 'The prompt timed out or was declined. Try again.'
  const lower = raw.toLowerCase().trim()

  // Mobile money — STK push / PIN errors
  if (lower.includes('ds timeout') || lower.includes('cannot be reached')) {
    return 'Your phone was unreachable. Make sure your line is on and try again.'
  }
  if (lower.includes('cancelled by user') || lower.includes('cancelled by subscriber')) {
    return 'You cancelled the prompt on your phone.'
  }
  if (lower.includes('declined') && lower.includes('user')) {
    return 'You declined the M-Pesa prompt. Try again to approve it.'
  }
  if (lower.includes('insufficient funds') || lower.includes('balance')) {
    return 'M-Pesa balance is too low. Top up and try again.'
  }
  if (lower.includes('invalid pin') || lower.includes('wrong pin')) {
    return 'The M-Pesa PIN was wrong. Try again with the correct PIN.'
  }
  if (lower.includes('locked') || lower.includes('blocked')) {
    return 'Your M-Pesa account is locked. Unlock it via Safaricom and try again.'
  }
  if (lower.includes('not registered') || lower.includes('not a valid') || lower.includes('invalid msisdn')) {
    return 'That number isn\u2019t registered for M-Pesa. Use a Safaricom or Airtel Money number.'
  }
  if (lower.includes('limit') || lower.includes('exceeded')) {
    return 'M-Pesa limit reached for the day. Try again tomorrow or use a card.'
  }

  // Card / 3DS errors
  if (lower.includes('declined') || lower.includes('do not honor')) {
    return 'Your bank declined the charge. Try a different card or method.'
  }
  if (lower.includes('cvv') || lower.includes('cvc')) {
    return 'The card security code was wrong. Check and try again.'
  }
  if (lower.includes('expired')) {
    return 'The card has expired. Use a different card.'
  }
  if (lower.includes('3ds') || lower.includes('authentication')) {
    return 'Your bank needs to verify the charge. Try again and complete the verification.'
  }

  // Generic timeouts / network
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The prompt timed out. Try again.'
  }
  if (lower.includes('network') || lower.includes('connection')) {
    return 'Network blip — try again in a moment.'
  }

  // Unknown code: generic friendly fallback. We deliberately do NOT surface
  // the raw paystack string here, even truncated, because the buyer-side
  // surfaces are public and these strings often read like stack traces.
  return 'Payment didn\u2019t go through. Try again, or use a different method.'
}
