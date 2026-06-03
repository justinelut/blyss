'use client'

import { useAuth } from '@/hooks'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Pill from '@/components/atoms/Pill'
import Link from 'next/link'
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
  FormMessage,
} from '@/components/ui/form'
import {
  ArrowUpRight,
  CheckCircle,
  Loader2,
  Phone,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from '../Toast/use-toast'
import {
  SettingsGroup,
  SettingsGroupActions,
  SettingsGroupItem,
} from './SettingsGroup'

interface MPesaConfigurationForm {
  mpesa_number: string
  payout_method: 'bank' | 'mpesa'
}

interface OrganizationMPesaSettingsProps {
  organization: schemas['Organization']
}

const OrganizationMPesaSettings: React.FC<OrganizationMPesaSettingsProps> = ({
  organization,
}) => {
  const { currentUser } = useAuth()
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const form = useForm<MPesaConfigurationForm>({
    defaultValues: {
      mpesa_number: (organization as any).mpesa_number || '',
      payout_method: (organization as any).payout_method || 'bank',
    },
  })

  const { handleSubmit, formState, watch } = form
  const mpesaNumber = watch('mpesa_number')
  const payoutMethod = watch('payout_method')

  // Get M-Pesa related fields from organization (these would be added to the Organization schema)
  const currentMPesaNumber = (organization as any).mpesa_number
  const mpesaVerified = (organization as any).mpesa_verified || false
  const subaccountStatus = (organization as any).subaccount_status || 'pending'

  const validateMPesaNumber = (value: string): string | true => {
    if (!value) return 'M-Pesa number is required'

    // Remove any spaces or dashes
    const cleaned = value.replace(/[\s\-]/g, '')

    // Check if it matches Kenyan M-Pesa format
    if (!/^\+254[17]\d{8}$/.test(cleaned)) {
      return 'M-Pesa number must be in Kenyan format (+254XXXXXXXXX) where X is a digit and the number starts with 7 or 1 after country code'
    }

    return true
  }

  const onConfigureMPesa = useCallback(
    async (data: MPesaConfigurationForm) => {
      if (!currentUser) return

      setIsConfiguring(true)
      try {
        await unwrap(
          api.POST('/v1/integrations/paystack/organizations/{id}/mpesa', {
            params: {
              path: { id: organization.id },
            },
            body: {
              mpesa_number: data.mpesa_number,
            },
          }),
        )

        toast({
          title: 'M-Pesa Configuration Started',
          description:
            'Verification transaction sent. Please check your M-Pesa for KES 10 transaction.',
        })

        // Refresh the page to show updated status
        window.location.reload()
      } catch (error: any) {
        toast({
          title: 'Configuration Failed',
          description: error.message || 'Failed to configure M-Pesa number',
          variant: 'error',
        })
      } finally {
        setIsConfiguring(false)
      }
    },
    [currentUser, organization.id],
  )

  const onVerifyMPesa = useCallback(async () => {
    if (!currentUser) return

    setIsVerifying(true)
    try {
      await unwrap(
        api.POST('/v1/integrations/paystack/organizations/{id}/mpesa/verify', {
          params: {
            path: { id: organization.id },
          },
        }),
      )

      toast({
        title: 'M-Pesa Verified',
        description:
          'Your M-Pesa number has been successfully verified for payouts.',
      })

      // Refresh the page to show updated status
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify M-Pesa number',
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }, [currentUser, organization.id])

  const onRetrySubaccount = useCallback(async () => {
    if (!currentUser) return

    setIsRetrying(true)
    try {
      await unwrap(
        api.POST(
          '/v1/integrations/paystack/organizations/{id}/subaccount/retry',
          {
            params: {
              path: { id: organization.id },
            },
          },
        ),
      )

      toast({
        title: 'Retrying payout setup',
        description: 'Setting up your payout account again.',
      })

      // Refresh the page to show updated status
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Retry Failed',
        description: error.message || 'Failed to set up your payout account',
        variant: 'destructive',
      })
    } finally {
      setIsRetrying(false)
    }
  }, [currentUser, organization.id])

  const getSubaccountStatusBadge = () => {
    switch (subaccountStatus) {
      case 'active':
        return (
          <Pill color="green" className="inline-flex items-center">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Pill>
        )
      case 'pending':
        return (
          <Pill color="gray" className="inline-flex items-center">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Pending
          </Pill>
        )
      case 'failed':
        return (
          <Pill color="red" className="inline-flex items-center">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Pill>
        )
      default:
        return <Pill color="gray">Unknown</Pill>
    }
  }

  const getMPesaStatusBadge = () => {
    if (!currentMPesaNumber) {
      return <Pill color="gray">Not Configured</Pill>
    }

    if (mpesaVerified) {
      return (
        <Pill color="green" className="inline-flex items-center">
          <CheckCircle className="mr-1 h-3 w-3" />
          Verified
        </Pill>
      )
    }

    return (
      <Pill color="yellow" className="inline-flex items-center">
        <Phone className="mr-1 h-3 w-3" />
        Pending Verification
      </Pill>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onConfigureMPesa)}>
        <Link
          href={`/dashboard/${organization.slug}/finance/account`}
          className="group mb-4 flex items-start justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Finance · Full setup
            </p>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">
              Set up your full payout account in Finance
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Submit business details, verify identity, and activate
              M&#8209;Pesa or Kenyan bank payouts. Required before your first
              withdrawal.
            </p>
          </div>
          <span className="mt-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>

        <SettingsGroup>
          <SettingsGroupItem
            title="Payout account"
            description="Status of your payout account. Activates automatically once your details are verified."
          >
            <div className="flex items-center gap-2">
              {getSubaccountStatusBadge()}
              {subaccountStatus === 'failed' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetrySubaccount}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
          </SettingsGroupItem>

          <SettingsGroupItem
            title="How do you want to get paid?"
            description="Pick where Blyss should send your earnings. You can change this later."
          >
            <FormField
              control={form.control}
              name="payout_method"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* M-Pesa card */}
                      <button
                        type="button"
                        onClick={() => field.onChange('mpesa')}
                        aria-pressed={field.value === 'mpesa'}
                        className={
                          'group flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors ' +
                          (field.value === 'mpesa'
                            ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-sunken)]')
                        }
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                            M-Pesa
                          </span>
                          <span
                            className={
                              'h-3 w-3 rounded-full ' +
                              (field.value === 'mpesa'
                                ? 'bg-[var(--accent)]'
                                : 'border border-[var(--border-strong)]')
                            }
                            aria-hidden="true"
                          />
                        </div>
                        <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                          Get paid straight to your phone. We send a KSh 10
                          confirmation transaction the first time so we know
                          the number is yours.
                        </p>
                      </button>

                      {/* Bank card */}
                      <button
                        type="button"
                        onClick={() => field.onChange('bank')}
                        aria-pressed={field.value === 'bank'}
                        className={
                          'group flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors ' +
                          (field.value === 'bank'
                            ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-sunken)]')
                        }
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                            Bank account
                          </span>
                          <span
                            className={
                              'h-3 w-3 rounded-full ' +
                              (field.value === 'bank'
                                ? 'bg-[var(--accent)]'
                                : 'border border-[var(--border-strong)]')
                            }
                            aria-hidden="true"
                          />
                        </div>
                        <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                          Direct deposit to your KES bank account. Standard
                          payout schedule, no extra steps after setup.
                        </p>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsGroupItem>

          {payoutMethod === 'mpesa' && (
            <>
              <SettingsGroupItem
                title="M-Pesa Configuration"
                description="Configure your M-Pesa number for receiving payouts"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {getMPesaStatusBadge()}
                  </div>

                  {currentMPesaNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Number:</span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {currentMPesaNumber}
                      </span>
                    </div>
                  )}
                </div>
              </SettingsGroupItem>

              <SettingsGroupItem
                title="M-Pesa Number"
                description="Enter your M-Pesa phone number in Kenyan format (+254XXXXXXXXX)"
              >
                <FormField
                  control={form.control}
                  name="mpesa_number"
                  rules={{
                    required:
                      payoutMethod === 'mpesa'
                        ? 'M-Pesa number is required'
                        : false,
                    validate:
                      payoutMethod === 'mpesa'
                        ? validateMPesaNumber
                        : undefined,
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+254712345678"
                          className="w-64"
                          onChange={(e) => {
                            let value = e.target.value
                            // Auto-format: add +254 if user starts typing without it
                            if (
                              value &&
                              !value.startsWith('+') &&
                              !value.startsWith('254')
                            ) {
                              if (value.startsWith('0')) {
                                value = '+254' + value.slice(1)
                              } else if (
                                value.startsWith('7') ||
                                value.startsWith('1')
                              ) {
                                value = '+254' + value
                              }
                            } else if (
                              value.startsWith('254') &&
                              !value.startsWith('+254')
                            ) {
                              value = '+' + value
                            }
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsGroupItem>

              {currentMPesaNumber && !mpesaVerified && (
                <SettingsGroupItem
                  title="Verification"
                  description="Complete M-Pesa verification to enable payouts"
                >
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      A KES 10 verification transaction was sent to your M-Pesa
                      number. Click verify once you receive it.
                    </p>
                    <Button
                      type="button"
                      onClick={onVerifyMPesa}
                      disabled={isVerifying}
                      size="sm"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify M-Pesa
                        </>
                      )}
                    </Button>
                  </div>
                </SettingsGroupItem>
              )}
            </>
          )}

          <SettingsGroupActions>
            {payoutMethod === 'mpesa' &&
              (!currentMPesaNumber || mpesaNumber !== currentMPesaNumber) && (
                <Button
                  type="submit"
                  disabled={
                    !formState.isValid ||
                    isConfiguring ||
                    subaccountStatus !== 'active'
                  }
                  loading={isConfiguring}
                >
                  {isConfiguring ? 'Configuring...' : 'Configure M-Pesa'}
                </Button>
              )}
          </SettingsGroupActions>
        </SettingsGroup>
      </form>
    </Form>
  )
}

export default OrganizationMPesaSettings
