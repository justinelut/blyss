'use client'

import { DashboardBody } from '@/components/Layout/DashboardLayout'
import { useReceivedTips, useTipsSummary } from '@/hooks/queries/donations'
import { schemas } from '@/lib/api'
import { FiHeart } from 'react-icons/fi'

const formatMoney = (amountMinor: number, currency: string): string => {
  const major = (amountMinor || 0) / 100
  const cur = (currency || 'kes').toUpperCase()
  if (cur === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (cur === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${cur} ${major.toLocaleString()}`
}

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function TipsPage({
  organization,
}: {
  organization: schemas['Organization']
}) {
  const { data: summary } = useTipsSummary(organization.id)
  const { data: tipsData, isLoading } = useReceivedTips(organization.id)
  const tips = tipsData?.items ?? []

  return (
    <DashboardBody className="gap-y-8 pb-16 md:gap-y-10" title="Tips">
      {/* Summary */}
      <div className="dark:border-polar-700 grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 sm:grid-cols-2">
        <div className="dark:border-polar-700 border-b border-gray-200 p-6 sm:border-b-0 sm:border-r">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Total tips received
          </p>
          <p className="mt-2 font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
            {summary
              ? formatMoney(summary.total_amount, summary.currency)
              : '—'}
          </p>
        </div>
        <div className="p-6">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Number of tips
          </p>
          <p className="mt-2 font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
            {summary ? summary.count.toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="font-sans text-[14px] text-[var(--text-secondary)]">
          Loading tips…
        </p>
      ) : tips.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
            <FiHeart size={18} aria-hidden="true" />
          </span>
          <h3 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
            No tips yet
          </h3>
          <p className="max-w-[48ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            When a fan tips you from your creator page, it shows up here —
            with their message and the amount. Share your page to invite
            support.
          </p>
        </div>
      ) : (
        <div className="dark:border-polar-700 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="dark:border-polar-700 border-b border-gray-200 text-left">
                {['From', 'Message', 'Amount', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tips.map((tip) => (
                <tr
                  key={tip.id}
                  className="dark:border-polar-800 border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
                      {tip.donor_name || 'Anonymous'}
                    </div>
                    <div className="font-sans text-[12px] text-[var(--text-muted)]">
                      {tip.donor_email}
                    </div>
                  </td>
                  <td className="max-w-[36ch] px-5 py-4 font-sans text-[14px] text-[var(--text-secondary)]">
                    {tip.message || (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-sans text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatMoney(tip.amount, tip.currency)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-sans text-[13px] text-[var(--text-secondary)]">
                    {formatDate(tip.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardBody>
  )
}
