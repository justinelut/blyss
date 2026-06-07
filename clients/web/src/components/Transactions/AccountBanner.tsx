import { useOrganizationAccount } from '@/hooks/queries'
import { ACCOUNT_TYPE_DISPLAY_NAMES, ACCOUNT_TYPE_ICON } from '@/utils/account'
import { ClientResponseError, schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import Banner from '@/components/molecules/Banner'
import { FiAlertCircle } from 'react-icons/fi'
import Link from 'next/link'
import Icon from '../Icons/Icon'

/**
 * Generic banner for Polar's legacy Stripe-Connect account flow. Only
 * shown when there is NO Blyss subaccount yet AND no in-flight Polar
 * onboarding. Blyss creators activate their payout subaccount via
 * /dashboard/{slug}/finance/account (M-Pesa or KE bank), which sets
 * organization.subaccount_status='active'. Once that flips, this
 * banner is suppressed unconditionally — see AccountBanner below.
 */
const GenericAccountBanner: React.FC<{
  account: schemas['Account'] | undefined
  setupLink: string
}> = ({ account, setupLink }) => {
  if (!account) {
    return (
      <Banner
        color="default"
        right={
          <Link href={setupLink}>
            <Button size="sm">Setup</Button>
          </Link>
        }
      >
        <FiAlertCircle
          className="h-6 w-6 text-[var(--accent)]"
          aria-hidden="true"
        />
        <span className="text-sm">
          You need to set up a <strong>payout account</strong> to receive
          payouts
        </span>
      </Banner>
    )
  }

  if (account && account.status === 'onboarding_started') {
    const AccountTypeIcon = ACCOUNT_TYPE_ICON[account.account_type]
    return (
      <Banner
        color="default"
        right={
          <Link href={setupLink}>
            <Button size="sm">Continue setup</Button>
          </Link>
        }
      >
        <Icon classes="bg-blue p-1" icon={<AccountTypeIcon />} />
        <span className="text-sm">
          Continue the setup of your{' '}
          <strong>{ACCOUNT_TYPE_DISPLAY_NAMES[account.account_type]}</strong>{' '}
          account to receive payouts
        </span>
      </Banner>
    )
  }

  return null
}

const AccountBanner = ({
  organization,
}: {
  organization: schemas['Organization']
}) => {
  const {
    data: organizationAccount,
    isLoading: organizationAccountIsLoading,
    error: accountError,
  } = useOrganizationAccount(organization?.id)
  const setupLink = `/dashboard/${organization.slug}/finance/account`

  if (organizationAccountIsLoading) {
    return null
  }

  const isNotAdmin =
    accountError &&
    (accountError as ClientResponseError)?.response?.status === 403

  if (isNotAdmin) {
    return null
  }

  // Blyss's primary payout signal lives on the org row, not on the
  // legacy Polar/Stripe `Account` table. If the M-Pesa / bank
  // subaccount is active (subaccount_code populated, status='active'),
  // suppress the banner — the creator has finished setup. Without this
  // gate, the banner persisted on /finance/income and /finance/payouts
  // forever after activation because Blyss never creates a Polar
  // `Account` row, so `useOrganizationAccount` always resolves to
  // undefined and the legacy "set up a payout account" banner showed.
  const subaccountCode = (organization as { subaccount_code?: string | null })
    .subaccount_code
  const subaccountStatus = (
    organization as { subaccount_status?: string }
  ).subaccount_status
  const blyssPayoutsActive =
    !!subaccountCode && subaccountStatus === 'active'
  if (blyssPayoutsActive) {
    return null
  }

  return (
    <GenericAccountBanner account={organizationAccount} setupLink={setupLink} />
  )
}

export default AccountBanner
