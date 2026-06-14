'use client'

import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/Tabs'
import React from 'react'
import { CurrencySelector } from '../../../CurrencySelector'
import { useMerchantSupportedCurrencies } from '@/hooks/queries/paystackConfig'

interface CurrencyTabsProps {
  activeCurrencies: string[]
  selectedCurrency: string
  onSelectCurrency: (currency: string) => void
  onAddCurrency: (currency: string) => void
  onRemoveCurrency: (currency: string) => void
  defaultCurrency: string
}

export const CurrencyTabs: React.FC<CurrencyTabsProps> = ({
  activeCurrencies,
  selectedCurrency,
  onSelectCurrency,
  onAddCurrency,
  onRemoveCurrency,
  defaultCurrency,
}) => {
  const merchantSupported = useMerchantSupportedCurrencies()

  // Hide the "Add currency" combobox when the merchant only supports a
  // single currency AND the creator already has it as their default.
  // Without this the picker shows an empty dropdown which is confusing
  // ("why can't I add anything?"). Replaced with a one-line note that
  // explains exactly why the picker is locked.
  const supportedSet = new Set(
    merchantSupported.map((c) => c.toLowerCase()),
  )
  const remainingChoices = merchantSupported.filter(
    (c) => !activeCurrencies.includes(c),
  )
  const onlyKesAvailable =
    merchantSupported.length === 1 && supportedSet.has('kes')

  return (
    <div className="flex flex-col gap-y-3 py-6">
      <div className="flex flex-row items-center justify-between gap-x-6">
        <h3 className="">Currencies</h3>

        {remainingChoices.length > 0 ? (
          <CurrencySelector
            onChange={onAddCurrency}
            excludeCurrencies={activeCurrencies}
            placeholder="Add Currency"
            className="h-8 w-auto text-xs"
          />
        ) : null}
      </div>
      {onlyKesAvailable ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Blyss currently charges in Kenyan Shillings only. Buyers
          outside Kenya can pay with their international Visa or
          Mastercard — Paystack converts at the live rate, you'll be
          paid in KES.
        </p>
      ) : null}
      <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Tabs value={selectedCurrency} onValueChange={onSelectCurrency}>
          <TabsList className="h-auto flex-wrap">
            {activeCurrencies.map((currency) => (
              <TabsTrigger
                key={currency}
                value={currency}
                className="flex h-8 items-center gap-2"
              >
                <span>{currency.toUpperCase()}</span>
                {currency !== defaultCurrency &&
                  selectedCurrency === currency && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveCurrency(currency)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          onRemoveCurrency(currency)
                        }
                      }}
                      className="dark:text-polar-400 dark:hover:text-polar-200 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <CloseOutlined fontSize="inherit" />
                    </span>
                  )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
