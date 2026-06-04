'use client'

import { useAuth } from '@/hooks'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Pill from '@/components/atoms/Pill'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useBanks } from '@/hooks/queries/banks'
import { CheckCircle, Loader2 } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from '../Toast/use-toast'
import {
  SettingsGroup,
  SettingsGroupActions,
  SettingsGroupItem,
} from './SettingsGroup'

interface BankConfigurationForm {
  bank_code: string
  account_number: string
  account_name: string
}

interface OrganizationBankSettingsProps {
  organization: schemas['Organization']
}

/**
 * OrganizationBankSettings — bank-payout configuration card.
 *
 * Lets a creator pick their settlement bank from the live Paystack-supported
 * KE bank list, enter their account number + account holder name, and
 * provision (or update) the Paystack subaccount with bank settlement.
 *
 * Renders inside the parent payout-settings card when payout_method === 'bank'.
 */
const OrganizationBankSettings: React.FC<OrganizationBankSettingsProps> = ({
  organization,
}) => {
  const { currentUser } = useAuth()
  const [isConfiguring, setIsConfiguring] = useState(false)

  const { data: banks, isLoading: banksLoading } = useBanks()

  const form = useForm<BankConfigurationForm>({
    mode: 'onChange',
    defaultValues: {
      bank_code: organization.bank_code || '',
      account_number: organization.bank_account_number || '',
      account_name: organization.bank_account_name || '',
    },
  })

  const { handleSubmit, formState, control } = form

  const currentBankCode = organization.bank_code
  const currentAccountNumber = organization.bank_account_number
  const subaccountStatus = organization.subaccount_status || 'pending'
  const isActive = subaccountStatus === 'active' && organization.payout_method === 'bank'

  const onConfigureBank = useCallback(
    async (data: BankConfigurationForm) => {
      if (!currentUser) return
      setIsConfiguring(true)
      try {
        await unwrap(
          (api as any).POST(
            '/v1/integrations/paystack/organizations/{id}/bank',
            {
              params: { path: { id: organization.id } },
              body: {
                bank_code: data.bank_code,
                account_number: data.account_number,
                account_name: data.account_name,
              },
            },
          ),
        )
        toast({
          title: 'Bank account configured',
          description: 'Your settlement bank account has been saved.',
        })
        window.location.reload()
      } catch (error: any) {
        toast({
          title: 'Configuration Failed',
          description:
            error?.body?.detail ||
            error?.message ||
            'Failed to configure bank account',
          variant: 'error',
        })
      } finally {
        setIsConfiguring(false)
      }
    },
    [currentUser, organization.id],
  )

  const getStatusBadge = () => {
    if (isActive) {
      return (
        <Pill color="green" className="inline-flex items-center">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </Pill>
      )
    }
    if (subaccountStatus === 'failed') {
      return <Pill color="red">Failed</Pill>
    }
    if (currentBankCode) {
      return <Pill color="yellow">Pending activation</Pill>
    }
    return <Pill color="gray">Not configured</Pill>
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onConfigureBank)}>
        <SettingsGroup>
          <SettingsGroupItem
            title="Bank account status"
            description="Status of your bank settlement account."
          >
            {getStatusBadge()}
          </SettingsGroupItem>

          {currentBankCode && currentAccountNumber && (
            <SettingsGroupItem
              title="Current settlement account"
              description="Configured bank account on file."
            >
              <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">
                    Account name:
                  </span>{' '}
                  {organization.bank_account_name || '—'}
                </div>
                <div>
                  <span className="font-medium text-[var(--text-primary)]">
                    Account number:
                  </span>{' '}
                  {currentAccountNumber}
                </div>
              </div>
            </SettingsGroupItem>
          )}

          <SettingsGroupItem
            title="Bank"
            description="Pick your settlement bank from the Paystack-supported list."
          >
            <FormField
              control={control}
              name="bank_code"
              rules={{ required: 'Please select your bank' }}
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={banksLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            banksLoading
                              ? 'Loading banks…'
                              : 'Select a bank'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(banks || []).map((b: any) => (
                          <SelectItem key={b.code} value={b.code}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsGroupItem>

          <SettingsGroupItem
            title="Account number"
            description="Your settlement bank account number."
          >
            <FormField
              control={control}
              name="account_number"
              rules={{
                required: 'Account number is required',
                minLength: {
                  value: 4,
                  message: 'Account number must be at least 4 digits',
                },
                pattern: {
                  value: /^\d+$/,
                  message: 'Account number must contain only digits',
                },
              }}
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      placeholder="01234567890"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsGroupItem>

          <SettingsGroupItem
            title="Account holder name"
            description="The name on the bank account, exactly as registered with the bank."
          >
            <FormField
              control={control}
              name="account_name"
              rules={{
                required: 'Account holder name is required',
                minLength: {
                  value: 2,
                  message: 'Account holder name must be at least 2 characters',
                },
              }}
              render={({ field }) => (
                <FormItem className="w-full max-w-md">
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="JANE NAMUKHULA WANJIRU"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsGroupItem>

          <SettingsGroupActions>
            <Button
              type="submit"
              disabled={!formState.isValid || isConfiguring || banksLoading}
              loading={isConfiguring}
            >
              {isConfiguring
                ? 'Saving…'
                : currentBankCode
                  ? 'Update bank account'
                  : 'Configure bank account'}
            </Button>
          </SettingsGroupActions>
        </SettingsGroup>
      </form>
    </Form>
  )
}

export default OrganizationBankSettings
