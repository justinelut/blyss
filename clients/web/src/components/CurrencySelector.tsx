'use client'

import { enums, schemas } from '@/lib/api'
import { Combobox } from '@/components/atoms/Combobox'
import { useMerchantSupportedCurrencies } from '@/hooks/queries/paystackConfig'
import { useCallback, useMemo, useState } from 'react'

interface CurrencySelectorProps {
  value?: schemas['PresentmentCurrency'] | null
  onChange: (value: string) => void
  disabled?: boolean
  excludeCurrencies?: string[]
  placeholder?: string
  className?: string
  /** Override the default merchant-currencies filter. Used in places
   *  that legitimately need to show every currency (admin tooling,
   *  legacy orgs that grandfathered prices in retired currencies).
   *  When omitted, the picker filters to whatever the merchant's
   *  Paystack account can actually charge today (default KES-only). */
  allowAllCurrencies?: boolean
}

const formatter = new Intl.DisplayNames('en-US', { type: 'currency' })

type CurrencyItem = { code: string; label: string }

const labelOverrides: Record<string, string> = {
  aed: 'UAE Dirham',
}

const pinnedCodes = ['kes', 'usd', 'eur', 'gbp']

const allCurrencies: CurrencyItem[] = enums.presentmentCurrencyValues
  .map((code) => ({
    code,
    label: labelOverrides[code] ?? formatter.of(code) ?? code.toUpperCase(),
  }))
  .sort((a, b) => {
    const aPin = pinnedCodes.indexOf(a.code)
    const bPin = pinnedCodes.indexOf(b.code)
    if (aPin !== -1 && bPin !== -1) return aPin - bPin
    if (aPin !== -1) return -1
    if (bPin !== -1) return 1
    return a.label.localeCompare(b.label)
  })

export const CurrencySelector = ({
  value,
  onChange,
  disabled,
  excludeCurrencies,
  placeholder = 'Select currency',
  className,
  allowAllCurrencies = false,
}: CurrencySelectorProps) => {
  const [query, setQuery] = useState('')
  const merchantSupported = useMerchantSupportedCurrencies()

  const baseCurrencies = useMemo(() => {
    // Filter to currencies the merchant's Paystack account can actually
    // charge. Without this, a creator could pick USD here and end up
    // with a USD-priced product the merchant can never collect — the
    // popup would later throw "Currency not supported by merchant" at
    // a real buyer. allowAllCurrencies bypasses for admin surfaces.
    let filtered = allCurrencies
    if (!allowAllCurrencies) {
      const supportedSet = new Set(merchantSupported.map((c) => c.toLowerCase()))
      // Keep the currently-selected value visible even if it's no longer
      // supported (so an org that grandfathered a price in a retired
      // currency can still SEE what they have, even if they can't add
      // more like it).
      filtered = allCurrencies.filter(
        (c) => supportedSet.has(c.code) || c.code === value,
      )
    }
    if (!excludeCurrencies || excludeCurrencies.length === 0) return filtered
    return filtered.filter((c) => !excludeCurrencies.includes(c.code))
  }, [excludeCurrencies, merchantSupported, allowAllCurrencies, value])

  const filteredCurrencies = useMemo(() => {
    if (!query) return baseCurrencies
    const q = query.toLowerCase()
    return baseCurrencies.filter(
      ({ code, label }) => code.includes(q) || label.toLowerCase().includes(q),
    )
  }, [query, baseCurrencies])

  const selectedItem = useMemo(
    () =>
      value ? (allCurrencies.find((c) => c.code === value) ?? null) : null,
    [value],
  )

  const handleChange = useCallback(
    (newValue: string | null) => {
      if (newValue) {
        onChange(newValue)
      }
    },
    [onChange],
  )

  return (
    <Combobox
      items={filteredCurrencies}
      value={value ?? null}
      selectedItem={selectedItem}
      onChange={handleChange}
      onQueryChange={setQuery}
      getItemValue={(item) => item.code}
      getItemLabel={(item) => item.label}
      renderItem={(item) => (
        <span className="flex flex-1 items-center gap-2">
          <span className="text-muted-foreground w-8 group-data-[selected=true]:text-white/60">
            {item.code.toUpperCase()}
          </span>
          <span className="truncate">{item.label}</span>
        </span>
      )}
      placeholder={placeholder}
      searchPlaceholder="Search currencies…"
      emptyLabel="No currencies found"
      popoverClassName="min-w-[230px]"
      popoverAlign="end"
      className={disabled ? 'pointer-events-none opacity-50' : className}
    />
  )
}
