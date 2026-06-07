import { describe, expect, it } from 'vitest'
import {
  isValidKenyanMsisdn,
  normalizeKenyanMsisdn,
} from '../kenyan-msisdn'

describe('normalizeKenyanMsisdn', () => {
  it.each([
    ['+254712345678', '254712345678'],
    ['254712345678', '254712345678'],
    ['0712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['+254 712 345 678', '254712345678'],
    ['0712 345 678', '254712345678'],
    ['+254-712-345-678', '254712345678'],
    ['(0712) 345 678', '254712345678'],
    // Airtel / Telkom 1XX
    ['0112345678', '254112345678'],
    ['+254112345678', '254112345678'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeKenyanMsisdn(input)).toBe(expected)
  })

  it.each([
    [''],
    ['abc'],
    ['12345'],
    // Wrong country code (UK)
    ['+447712345678'],
    // 9 digits but not starting with 1 or 7
    ['912345678'],
    // 10 digits not starting with 0
    ['1712345678'],
  ])('returns null for bad input %s', (input) => {
    expect(normalizeKenyanMsisdn(input)).toBeNull()
  })
})

describe('isValidKenyanMsisdn', () => {
  it('returns true for valid input', () => {
    expect(isValidKenyanMsisdn('0712345678')).toBe(true)
    expect(isValidKenyanMsisdn('+254712345678')).toBe(true)
  })

  it('returns false for invalid input', () => {
    expect(isValidKenyanMsisdn('123')).toBe(false)
    expect(isValidKenyanMsisdn('')).toBe(false)
  })
})
