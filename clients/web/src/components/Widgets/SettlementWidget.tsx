'use client'

/**
 * SettlementWidget — replaces the legacy Polar AccountWidget on the
 * dashboard home grid. Blyss creators don't have a Polar account
 * balance to withdraw from; what they have is a stream of Paystack
 * subaccount settlements (T+1 to T+3 to their bank/M-Pesa). This
 * widget surfaces the most recent confirmed settlement + a small
 * tail of recent ones, so the home page reflects reality instead of
 * promising "$0 / Withdraw / You may only withdraw funds above $10"
 * — a Polar/Stripe artifact that never applied to Blyss.
 */

import { useContext } from 'react'

import { OrganizationContext } from '@/providers/maintainerOrganization'
import { useSettlements } from '@/hooks/queries/settlements'
import { formatCurrency } from '@/lib/currency'
import { Card } from '@/components/atoms/Card'
import { Status } from '@/components/atoms/Status'
import { twMerge } from 'tailwind-merge'
import { WidgetContainer } from './WidgetContainer'

export interface SettlementWidgetProps {
  className?: string
}

export const SettlementWidget = ({ className }: SettlementWidgetProps) => {
  const { organization } = useContext(OrganizationContext)
  const { data: settlementsData } = useSettlements(organization.id, {
    page: 1,
    limit: 6,
  })
  const settlements = settlementsData?.items ?? []

  const lastSuccessful = settlements.find((s) => s.status === 'success')

  // Header amount: most recent successful settlement, or 0 if none yet.
  const headerAmount = lastSuccessful?.amount ?? 0
  const headerCurrency = lastSuccessful?.currency ?? 'kes'

  return (
    <WidgetContainer
      title="Last settlement"
      action={
        <h2 className="text-lg">
          {formatCurrency('compact')(headerAmount, headerCurrency)}
        </h2>
      }
      className={className}
    >
      {settlements.length > 0 ? (
        <div className="flex flex-col gap-y-2 pb-6">
          {settlements.slice(0, 4).map((s) => (
            <Card
              key={s.id}
              className="dark:bg-polar-800 flex flex-col gap-y-1 rounded-xl border-none bg-[var(--surface)] px-4 py-4"
            >
              <div className="dark:text-polar-400 flex flex-row items-baseline justify-between text-sm text-[var(--text-secondary)]">
                <span>
                  {s.settled_at
                    ? new Date(s.settled_at).toLocaleDateString('en-KE', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'In transit'}
                </span>
                <Status
                  status={s.status}
                  className={twMerge(
                    'px-1.5 py-0.5 text-xs capitalize',
                    s.status === 'success'
                      ? 'bg-[var(--surface-sunken)] text-[var(--success)]'
                      : s.status === 'failed'
                        ? 'bg-[var(--surface-sunken)] text-[var(--danger)]'
                        : s.status === 'reversed'
                          ? 'bg-[var(--surface-sunken)] text-[var(--warning)]'
                          : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]',
                  )}
                />
              </div>
              <div className="flex flex-row justify-between gap-x-4">
                <h3 className="font-sans text-[14px] text-[var(--text-primary)]">
                  {s.recipient_name ?? 'Settlement'}
                  {s.recipient_account_last4 ? ` · ${s.recipient_account_last4}` : ''}
                </h3>
                <span className="font-sans tabular-nums text-[var(--text-primary)]">
                  {formatCurrency('compact')(s.amount, s.currency)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-6 flex flex-1 flex-col items-center justify-center gap-y-2 rounded-lg bg-[var(--surface)] p-8 text-center">
          <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            No settlements yet
          </h3>
          <p className="font-sans text-sm text-[var(--text-muted)]">
            Paystack settles your sales automatically. The first
            confirmed settlement will appear here.
          </p>
        </div>
      )}
    </WidgetContainer>
  )
}
