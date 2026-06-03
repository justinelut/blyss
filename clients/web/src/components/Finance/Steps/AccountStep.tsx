'use client'

import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { Card } from '@/components/ui/card'
import { ArrowRight, UserCheck } from 'lucide-react'
import React from 'react'
import OrganizationMPesaSettings from '@/components/Settings/OrganizationMPesaSettings'

interface AccountStepProps {
  organization: schemas['Organization']
  isNotAdmin: boolean
  onSkipAccountSetup?: () => void
}

const StepCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => <Card className={`p-6 ${className}`}>{children}</Card>

export default function AccountStep({
  organization,
  isNotAdmin,
  onSkipAccountSetup,
}: AccountStepProps) {
  const subaccountStatus = (organization as any).subaccount_status || 'pending'
  const payoutMethod = (organization as any).payout_method || 'bank'
  const mpesaVerified = (organization as any).mpesa_verified || false
  const mpesaNumber = (organization as any).mpesa_number

  const isAccountSetupComplete =
    subaccountStatus === 'active' &&
    ((payoutMethod === 'mpesa' && mpesaVerified && mpesaNumber) ||
      payoutMethod === 'bank')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center space-x-3">
          <h1 className="text-2xl font-semibold">Payout Account</h1>
        </div>
        <p className="dark:text-polar-400 mx-auto max-w-2xl text-lg text-[var(--text-secondary)]">
          {isAccountSetupComplete
            ? 'Your payout account details and status.'
            : isNotAdmin
              ? 'Account setup requires admin privileges.'
              : 'Configure your payout method to receive payments.'}
        </p>
      </div>

      {/* Account Information */}
      {isNotAdmin ? (
        <StepCard className="dark:border-polar-600 border-[var(--border)]">
          <div className="space-y-4">
            <div className="space-y-4 text-center">
              <div className="dark:bg-polar-800 dark:border-polar-600 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
                <div className="mb-4 flex justify-center">
                  <div className="dark:bg-polar-700 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-sunken)]">
                    <UserCheck className="dark:text-polar-400 h-6 w-6 text-[var(--text-muted)]" />
                  </div>
                </div>
                <h4 className="dark:text-polar-400 mb-2 font-medium text-[var(--text-secondary)]">
                  Account Setup Restricted
                </h4>
                <p className="dark:text-polar-500 mx-auto mb-4 max-w-md text-sm text-[var(--text-muted)]">
                  You are not the admin of the account. Only the account admin
                  can set up payout accounts.
                </p>
                {onSkipAccountSetup && (
                  <Button
                    onClick={onSkipAccountSetup}
                    variant="default"
                    className="w-auto"
                  >
                    Skip & Continue to Identity Verification
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <p className="dark:text-polar-400 mt-3 text-xs text-[var(--text-muted)]">
                  The account admin will need to complete this step separately
                </p>
              </div>
            </div>
          </div>
        </StepCard>
      ) : (
        <StepCard>
          <OrganizationMPesaSettings organization={organization} />
        </StepCard>
      )}
    </div>
  )
}
