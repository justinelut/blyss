'use client'

import { DashboardBody } from '@/components/Layout/DashboardLayout'
import {
  DataTable,
  DataTableColumnDef,
  DataTableColumnHeader,
} from '@/components/atoms/DataTable'
import FormattedDateTime from '@/components/atoms/FormattedDateTime'
import { ReceivedTip, useReceivedTips, useTipsSummary } from '@/hooks/queries/donations'
import { schemas } from '@/lib/api'
import {
  DataTablePaginationState,
  serializeSearchParams,
} from '@/utils/datatable'
import { FiHeart } from 'react-icons/fi'
import { useRouter } from 'next/navigation'

const formatMoney = (amountMinor: number, currency: string): string => {
  const major = (amountMinor || 0) / 100
  const cur = (currency || 'kes').toUpperCase()
  if (cur === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (cur === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${cur} ${major.toLocaleString()}`
}

export default function TipsPage({
  organization,
  pagination,
}: {
  organization: schemas['Organization']
  pagination: DataTablePaginationState
}) {
  const router = useRouter()
  const { data: summary } = useTipsSummary(organization.id)
  const { data: tipsData, isLoading } = useReceivedTips(organization.id, {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })

  const tips = tipsData?.items ?? []
  const rowCount = tipsData?.pagination.total_count ?? 0
  const pageCount = tipsData?.pagination.max_page ?? 1

  const setPagination = (
    updaterOrValue:
      | DataTablePaginationState
      | ((old: DataTablePaginationState) => DataTablePaginationState),
  ) => {
    const updated =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue
    router.push(
      `/dashboard/${organization.slug}/tips?${serializeSearchParams(updated, [])}`,
    )
  }

  const columns: DataTableColumnDef<ReceivedTip>[] = [
    {
      accessorKey: 'donor_name',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="From" />
      ),
      cell: ({ row: { original: tip } }) => (
        <div className="flex flex-col">
          <span className="fw-medium text-[var(--text-primary)]">
            {tip.donor_name || 'Anonymous'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {tip.donor_email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'message',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row: { original: tip } }) =>
        tip.message ? (
          <span className="line-clamp-2 max-w-[36ch] text-[var(--text-secondary)]">
            {tip.message}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      accessorKey: 'amount',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row: { original: tip } }) => (
        <span className="fw-medium tabular-nums">
          {formatMoney(tip.amount, tip.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: (props) => (
        <FormattedDateTime datetime={props.getValue() as string} />
      ),
    },
  ]

  return (
    <DashboardBody className="gap-y-8 pb-16 md:gap-y-10" title="Tips">
      {/* Summary */}
      <div className="dark:border-polar-700 grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 sm:grid-cols-2">
        <div className="dark:border-polar-700 border-b border-gray-200 p-6 sm:border-b-0 sm:border-r">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Total tips received
          </p>
          <p className="mt-2 font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
            {summary ? formatMoney(summary.total_amount, summary.currency) : '—'}
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

      {/* List — shared Polar DataTable with server-driven pagination */}
      {!isLoading && tips.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
            <FiHeart size={18} aria-hidden="true" />
          </span>
          <h3 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
            No tips yet
          </h3>
          <p className="max-w-[48ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            When a fan tips you from your creator page, it shows up here — with
            their message and the amount. Share your page to invite support.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tips}
          rowCount={rowCount}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={isLoading}
          getRowId={(row) => row.id.toString()}
        />
      )}
    </DashboardBody>
  )
}
