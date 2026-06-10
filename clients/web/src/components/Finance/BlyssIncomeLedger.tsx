/* Hallmark · component: finance/blyss-income-ledger · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * BlyssIncomeLedger — an orders-based income table for creators on
 * Paystack. The legacy TransactionsList reads Polar `Transaction` rows
 * (a Stripe-era ledger) which Blyss never writes, so the income page
 * table showed "No Results" even when sales existed. This lists the
 * actual paid orders with gross / marketplace-fee / net per row using
 * the shared Polar DataTable (server-driven pagination: page 1, 2, …).
 */
'use client'

import {
  DataTable,
  DataTableColumnDef,
  DataTableColumnHeader,
} from '@/components/atoms/DataTable'
import FormattedDateTime from '@/components/atoms/FormattedDateTime'
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

export const BlyssIncomeLedger = ({
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

  const columns: DataTableColumnDef<schemas['Order']>[] = [
    {
      accessorKey: 'created_at',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: (props) => (
        <FormattedDateTime datetime={props.getValue() as string} />
      ),
    },
    {
      accessorKey: 'product',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row: { original: order } }) => {
        const lineItems = (order.items ?? []).filter((it: any) => !!it?.label)
        if (lineItems.length > 1) {
          return (
            <div className="flex flex-col gap-0.5">
              {lineItems.map((it: any) => (
                <span key={it.id} className="text-sm">
                  {it.label}
                </span>
              ))}
            </div>
          )
        }
        return <span>{order.product?.name ?? '—'}</span>
      },
    },
    {
      accessorKey: 'total_amount',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Gross"
          className="flex justify-end"
        />
      ),
      cell: ({ row: { original: order } }) => (
        <div className="flex flex-row justify-end tabular-nums">
          {fmt(order.total_amount, order.currency)}
        </div>
      ),
    },
    {
      accessorKey: 'platform_fee_amount',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Fee"
          className="flex justify-end"
        />
      ),
      cell: ({ row: { original: order } }) => (
        <div className="flex flex-row justify-end tabular-nums">
          {fmt(order.platform_fee_amount ?? 0, order.currency)}
        </div>
      ),
    },
    {
      accessorKey: 'net_amount',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Net"
          className="flex justify-end"
        />
      ),
      cell: ({ row: { original: order } }) => {
        // Creator take-home = gross minus the marketplace fee minus any
        // refund. Mirrors the earnings-summary math on the server.
        const net =
          order.total_amount -
          (order.platform_fee_amount ?? 0) -
          (order.refunded_amount ?? 0)
        return (
          <div className="flex flex-row justify-end font-medium tabular-nums">
            {fmt(net, order.currency)}
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
