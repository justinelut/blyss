'use client'

import { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiGlobe } from 'react-icons/fi'
import { cn } from '@/lib/utils'
import {
  SUPPORTED_COUNTRIES,
  CURRENCY_LABELS,
  currencyForCountry,
} from '@/lib/geo'
import { useCurrencyControls } from './CurrencyProvider'

const COUNTRY_NAMES: Record<string, string> = {
  ke: 'Kenya',
  us: 'United States',
  gb: 'United Kingdom',
  ng: 'Nigeria',
  gh: 'Ghana',
  za: 'South Africa',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  it: 'Italy',
  nl: 'Netherlands',
  ie: 'Ireland',
  pt: 'Portugal',
}

/**
 * CountrySwitcher — lets the visitor change region/currency.
 *
 * Because the marketplace filters products by currency server-side (no FX
 * conversion), switching writes the country cookie and reloads so the SSR'd
 * grid re-filters to products priced in the chosen currency.
 */
export function CountrySwitcher({ className }: { className?: string }) {
  const { country, currency, setCountry } = useCurrencyControls()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change country and currency"
        className="flex h-10 items-center gap-1.5 rounded-md px-2.5 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
      >
        <FiGlobe size={18} />
        <span className="tabular-nums">
          {(CURRENCY_LABELS[currency] ?? currency.toUpperCase())}
        </span>
        <FiChevronDown size={14} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 max-h-80 w-56 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] py-1"
        >
          {SUPPORTED_COUNTRIES.map((c) => {
            const cur = currencyForCountry(c)
            const active = c === country
            return (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false)
                  if (c !== country) setCountry(c)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left font-sans text-sm transition-colors',
                  active
                    ? 'bg-[var(--surface-sunken)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
                )}
              >
                <span>{COUNTRY_NAMES[c] ?? c.toUpperCase()}</span>
                <span className="tabular-nums text-[var(--text-muted)]">
                  {CURRENCY_LABELS[cur] ?? cur.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
