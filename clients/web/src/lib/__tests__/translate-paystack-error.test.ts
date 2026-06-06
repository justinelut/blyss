import { describe, expect, it } from 'vitest'
import { translatePaystackError } from '../paystack/translate-error'

/**
 * The Paystack gateway returns codes like "DS timeout user cannot be reached"
 * that read like stack traces to a buyer. The translator turns each into a
 * polite, action-oriented sentence.
 *
 * If you ever see a paystack response in production logs that surfaces raw
 * here, add the lowercased keyword to the translator + a test row below so
 * the regression is locked.
 */
describe('translatePaystackError', () => {
  it('translates DS timeout to a phone-unreachable message', () => {
    expect(translatePaystackError('DS timeout user cannot be reached')).toBe(
      'Your phone was unreachable. Make sure your line is on and try again.',
    )
  })

  it('translates user-cancelled message', () => {
    expect(
      translatePaystackError('Cancelled by user / subscriber'),
    ).toMatch(/cancelled the prompt/i)
  })

  it('translates declined-by-user message', () => {
    expect(
      translatePaystackError('Request declined by user'),
    ).toMatch(/declined the M-Pesa prompt/i)
  })

  it('translates insufficient funds', () => {
    expect(
      translatePaystackError('Insufficient funds in customer account'),
    ).toMatch(/balance is too low/i)
  })

  it('translates wrong PIN', () => {
    expect(translatePaystackError('Invalid PIN entered')).toMatch(
      /M-Pesa PIN was wrong/i,
    )
  })

  it('translates locked account', () => {
    expect(translatePaystackError('Customer account is locked')).toMatch(
      /M-Pesa account is locked/i,
    )
  })

  it('translates unregistered number', () => {
    expect(
      translatePaystackError('Invalid MSISDN format'),
    ).toMatch(/Use a Safaricom or Airtel Money/i)
  })

  it('translates daily limit exceeded', () => {
    expect(translatePaystackError('Daily limit exceeded')).toMatch(
      /M-Pesa limit reached/i,
    )
  })

  it('translates card declined', () => {
    expect(translatePaystackError('Do not honor')).toMatch(
      /bank declined the charge/i,
    )
  })

  it('translates wrong CVV', () => {
    expect(translatePaystackError('Invalid CVV')).toMatch(
      /security code was wrong/i,
    )
  })

  it('translates expired card', () => {
    expect(translatePaystackError('Card has expired')).toMatch(
      /card has expired/i,
    )
  })

  it('translates 3DS auth failure', () => {
    expect(translatePaystackError('3DS authentication failed')).toMatch(
      /verify the charge/i,
    )
  })

  it('translates timeout', () => {
    expect(translatePaystackError('Request timed out')).toMatch(
      /timed out/i,
    )
  })

  it('translates network blip', () => {
    expect(translatePaystackError('Network connection error')).toMatch(
      /Network blip/i,
    )
  })

  it('does not surface unknown raw paystack strings', () => {
    // The buyer must never see something like "PSK_FOO_BAR_INTERNAL_ERR"
    // verbatim. The fallback is a friendly generic message.
    const raw = 'PSK_FOO_BAR_INTERNAL_ERR-stacktrace-leak'
    const out = translatePaystackError(raw)
    expect(out).not.toContain(raw)
    expect(out).toMatch(/didn't go through|didn\u2019t go through/i)
  })

  it('handles null / undefined / empty without throwing', () => {
    expect(translatePaystackError(null)).toMatch(/timed out|declined/i)
    expect(translatePaystackError(undefined)).toMatch(/timed out|declined/i)
    expect(translatePaystackError('')).toMatch(/timed out|declined/i)
  })

  it('is case-insensitive', () => {
    expect(translatePaystackError('ds TIMEOUT user CANNOT be reached')).toBe(
      'Your phone was unreachable. Make sure your line is on and try again.',
    )
  })
})
