/* Hallmark · component: finance/blyss-payout-ledger · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * BlyssPayoutLedger — settlement view for creators on Paystack.
 *
 * Two data sources, in order of preference:
 *   1. Real Paystack settlement events from `/v1/paystack-settlements/`.
 *      Recorded by the `paystack.webhook.transfer.success / .failed /
 *      .reversed` actors. Authoritative — shows Paystack's actual
 *      transfer timestamps + amounts + recipient details.
 *   2. Fallback: order-derived view with computed `order_date + 2
 *      working days` settlement estimates. Used until enough
 *      `transfer.*` webhook events have rolled in. Each row gets an
 *      "Estimated" badge so the creator knows it's a projection,
 *      not a confirmation.
 *
 * The transition between (1) and (2) is automatic: as soon as the
 * settlements endpoint returns at least one row, we switch to it.
 */
'use client'

import {
  DataTable,
  DataTableColumnDef,
  DataTableColumnHeader,
} from '@/components/atoms/DataTable'
import FormattedDateTime from '@/components/atoms/FormattedDateTime'
import { Status } from '@/components/atoms/Status'
import { useOrders } from '@/hooks/queries/orders'
import {
  useSettlements,
  type PaystackSettlement,
} from '@/hooks/queries/settlements'
import { schemas } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import {
  DataTablePaginationState,
  DataTableSortingState,
  getAPIParams,
  serializeSearchParams,
} from '@/utils/datatable'
import { usePathname, useRouter } from 'next/navigation'

/** Paystack settles on T+2 working days. Compute the expected settlement
 *  date from the order date, skipping Sat/Sun. Used only for the
 *  fallback view when no real settlements are recorded yet. */
const settlementDate = (orderIso: string): Date => {
  const d = new Date(orderIso)
  let added = 0
  while (added < 2) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return d
}

interface Props {
  organization: schemas['Organization']
  pagination: DataTablePaginationState
  sorting: DataTableSortingState
}

export const BlyssPayoutLedger = ({
  organization,
  pagination,
  sorting,
}: Props) => {
  const router = useRouter()
  const pathname = usePathname()

  const setPagination = (
    updaterOrValue:
      | DataTablePaginationState
      | ((old: DataTablePaginationState) => DataTablePaginationState),
  ) => {
    const updated =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue
    router.push(`${pathname}?${serializeSearchParams(updated, sorting)}`)
  }

  const setSorting = (
    updaterOrValue:
      | DataTableSortingState
      | ((old: DataTableSortingState) => DataTableSortingState),
  ) => {
    const updated =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting)
        : updaterOrValue
    router.push(`${pathname}?${serializeSearchParams(pagination, updated)}`)
  }

  // Try real settlements first.
  const settlementsHook = useSettlements(organization.id, {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })
  const settlements = settlementsHook.data?.items ?? []
  const hasRealSettlements = settlements.length > 0

  if (hasRealSettlements) {
    return (
      <SettlementsTable
        settlements={settlements}
        rowCount={
          settlementsHook.data?.pagination.total_count ?? settlements.length
        }
        pageCount={settlementsHook.data?.pagination.max_page ?? 1}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={settlementsHook.isLoading}
      />
    )
  }

  return (
    <EstimatedFromOrders
      organization={organization}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  )
}

// ─── Real-settlements table ───────────────────────────────────────────

const SettlementsTable: React.FC<{
  settlements: PaystackSettlement[]
  rowCount: number
  pageCount: number
  pagination: DataTablePaginationState
  onPaginationChange: (
    u: DataTablePaginationState | ((s: DataTablePaginationState) => DataTablePaginationState),
  ) => void
  sorting: DataTableSortingState
  onSortingChange: (
    u: DataTableSortingState | ((s: DataTableSortingState) => DataTableSortingState),
  ) => void
  isLoading: boolean
}> = ({
  settlements,
  rowCount,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading,
}) => {
  const fmt = formatCurrency('accounting')

  const columns: DataTableColumnDef<PaystackSettlement>[] = [
    {
      id: 'settled_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Settled" />
      ),
      cell: ({ row: { original: s } }) =>
        s.settled_at ? (
          <FormattedDateTime datetime={s.settled_at} />
        ) : (
          <span className="text-[var(--text-muted)]">In transit</span>
        ),
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row: { original: s } }) => {
        const styles: Record<PaystackSettlement['status'], string> = {
          success:
            'bg-[var(--surface-sunken)] text-xs text-[var(--success)]',
          pending: 'bg-[var(--surface-sunken)] text-xs text-[var(--text-muted)]',
          failed: 'bg-[var(--surface-sunken)] text-xs text-[var(--danger)]',
          reversed:
            'bg-[var(--surface-sunken)] text-xs text-[var(--warning)]',
        }
        const labels: Record<PaystackSettlement['status'], string> = {
          success: 'Settled',
          pending: 'Pending',
          failed: 'Failed',
          reversed: 'Reversed',
        }
        return (
          <Status status={labels[s.status]} className={styles[s.status]} />
        )
      },
    },
    {
      id: 'recipient',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Settled to" />
      ),
      cell: ({ row: { original: s } }) => {
        const name = s.recipient_name ?? 'Your payout account'
        const last4 = s.recipient_account_last4
          ? ` · ending ${s.recipient_account_last4}`
          : ''
        return (
          <span className="font-sans text-[13px] text-[var(--text-secondary)]">
            {name}
            {last4}
          </span>
        )
      },
    },
    {
      id: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Amount"
          className="flex justify-end"
        />
      ),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-row justify-end font-medium tabular-nums">
          {fmt(s.amount, s.currency)}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={settlements}
      rowCount={rowCount}
      pageCount={pageCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      getRowId={(row) => row.id}
    />
  )
}

// ─── Fallback: order-derived estimate ─────────────────────────────────

const EstimatedFromOrders: React.FC<{
  organization: schemas['Organization']
  pagination: DataTablePaginationState
  onPaginationChange: (
    u: DataTablePaginationState | ((s: DataTablePaginationState) => DataTablePaginationState),
  ) => void
  sorting: DataTableSortingState
  onSortingChange: (
    u: DataTableSortingState | ((s: DataTableSortingState) => DataTableSortingState),
  ) => void
}> = ({
  organization,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
}) => {
  const ordersHook = useOrders(organization.id, getAPIParams(pagination, sorting))
  const orders = ordersHook.data?.items || []
  const rowCount = ordersHook.data?.pagination.total_count ?? 0
  const pageCount = ordersHook.data?.pagination.max_page ?? 1

  const fmt = formatCurrency('accounting')
  const now = Date.now()

  const columns: DataTableColumnDef<schemas['Order']>[] = [
    {
      accessorKey: 'created_at',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sale date" />
      ),
      cell: (props) => (
        <FormattedDateTime datetime={props.getValue() as string} />
      ),
    },
    {
      id: 'settlement',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Settles (estimated)" />
      ),
      cell: ({ row: { original: order } }) => {
        const settles = settlementDate(order.created_at)
        const done = settles.getTime() <= now
        return (
          <div className="flex items-center gap-2">
            <FormattedDateTime
              datetime={settles.toISOString()}
              resolution="day"
            />
            <Status
              status={done ? 'Estimated' : 'Pending'}
              className="bg-[var(--surface-sunken)] text-xs text-[var(--text-muted)]"
            />
          </div>
        )
      },
    },
    {
      id: 'payout',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Payout (to you)"
          className="flex justify-end"
        />
      ),
      cell: ({ row: { original: order } }) => {
        const payout =
          order.total_amount -
          (order.platform_fee_amount ?? 0) -
          (order.refunded_amount ?? 0)
        return (
          <div className="flex flex-row justify-end font-medium tabular-nums">
            {fmt(payout, order.currency)}
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={orders}
      rowCount={rowCount}
      pageCount={pageCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      isLoading={ordersHook.isLoading}
      getRowId={(row) => row.id.toString()}
    />
  )
}
