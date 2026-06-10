/* Hallmark · component: finance/blyss-payout-ledger · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * BlyssPayoutLedger — a settlements view for creators on Paystack. Paystack
 * splits every sale at payment time and settles the creator's 80% share
 * directly to their M-Pesa / bank on a T+2 schedule. There is no Polar
 * Payout object to list (the legacy usePayouts table is always empty for
 * Blyss creators), so we present each paid order as a settlement line:
 * the amount that landed (or will land) in the creator's wallet and the
 * expected settlement date. Uses the shared Polar DataTable.
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
 *  date from the order date, skipping Sat/Sun. */
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

export const BlyssPayoutLedger = ({
  organization,
  pagination,
  sorting,
}: {
  organization: schemas['Organization']
  pagination: DataTablePaginationState
  sorting: DataTableSortingState
}) => {
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
        <DataTableColumnHeader column={column} title="Settles" />
      ),
      cell: ({ row: { original: order } }) => {
        const settles = settlementDate(order.created_at)
        const done = settles.getTime() <= now
        return (
          <div className="flex items-center gap-2">
            <FormattedDateTime datetime={settles.toISOString()} resolution="day" />
            <Status
              status={done ? 'Settled' : 'Pending'}
              className={
                done
                  ? 'bg-green-100 text-xs text-green-700 dark:bg-green-950'
                  : 'bg-[var(--surface-sunken)] text-xs text-[var(--text-muted)]'
              }
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
        // Creator receives the order total minus the marketplace fee
        // minus any refund. Mirrors the 80/20 Paystack split.
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
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      isLoading={ordersHook.isLoading}
      getRowId={(row) => row.id.toString()}
    />
  )
}
