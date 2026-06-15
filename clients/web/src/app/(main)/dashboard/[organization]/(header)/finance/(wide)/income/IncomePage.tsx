'use client'

import AccessRestricted from '@/components/Finance/AccessRestricted'
import { BlyssEarningsCard } from '@/components/Finance/BlyssEarningsCard'
import { BlyssIncomeLedger } from '@/components/Finance/BlyssIncomeLedger'
import AccountBalance from '@/components/Payouts/AccountBalance'
import AccountBanner from '@/components/Transactions/AccountBanner'
import TransactionsList from '@/components/Transactions/TransactionsList'
import { useOrganizationAccount, useSearchTransactions } from '@/hooks/queries'
import {
  DataTablePaginationState,
  DataTableSortingState,
  getAPIParams,
  serializeSearchParams,
} from '@/utils/datatable'
import { ClientResponseError, schemas } from '@/lib/api'
import { usePathname, useRouter } from 'next/navigation'

export default function ClientPage({
  pagination,
  sorting,
  organization,
}: {
  pagination: DataTablePaginationState
  sorting: DataTableSortingState
  organization: schemas['Organization']
}) {
  const router = useRouter()
  const pathname = usePathname()

  const setPagination = (
    updaterOrValue:
      | DataTablePaginationState
      | ((old: DataTablePaginationState) => DataTablePaginationState),
  ) => {
    const updatedPagination =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue

    router.push(
      `${pathname}?${serializeSearchParams(updatedPagination, sorting)}`,
    )
  }

  const setSorting = (
    updaterOrValue:
      | DataTableSortingState
      | ((old: DataTableSortingState) => DataTableSortingState),
  ) => {
    const updatedSorting =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting)
        : updaterOrValue

    router.push(
      `${pathname}?${serializeSearchParams(pagination, updatedSorting)}`,
    )
  }

  const {
    data: account,
    isLoading: accountIsLoading,
    error: accountError,
  } = useOrganizationAccount(organization.id)

  const isNotAdmin =
    accountError &&
    (accountError as ClientResponseError)?.response?.status === 403

  // Paystack creators have no Polar Account / Transaction ledger — those are
  // Stripe-era. Show an orders-based income table instead of the empty
  // TransactionsList.
  const isPaystackOrg = Boolean(
    (organization as { subaccount_status?: string }).subaccount_status ===
      'active' &&
      (organization as { subaccount_code?: string | null }).subaccount_code,
  )

  const balancesHook = useSearchTransactions({
    account_id: account?.id,
    type: 'balance',
    exclude_platform_fees: true,
    ...getAPIParams(pagination, sorting),
  })
  const balances = balancesHook.data?.items || []
  const rowCount = balancesHook.data?.pagination.total_count ?? 0
  const pageCount = balancesHook.data?.pagination.max_page ?? 1

  if (isNotAdmin) {
    return (
      <div className="flex flex-col gap-y-6">
        <AccessRestricted message="You are not the admin of the account. Only the account admin can view income information." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-8">
      <AccountBanner organization={organization} />
      {/* Blyss is Paystack-only — always render BlyssEarningsCard;
          never fall back to the legacy AccountBalance + Withdraw
          widget. Paystack auto-settles T+2 with no manual withdrawal
          step. The card handles the no-subaccount empty state. */}
      <BlyssEarningsCard organization={organization} />
      {isPaystackOrg ? (
        <BlyssIncomeLedger
          organization={organization}
          pagination={pagination}
          sorting={sorting}
        />
      ) : (
        <TransactionsList
          transactions={balances}
          rowCount={rowCount}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={accountIsLoading || balancesHook.isLoading}
        />
      )}
    </div>
  )
}
