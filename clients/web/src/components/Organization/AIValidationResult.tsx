'use client'

import { useOrganizationReviewStatus } from '@/hooks/queries/org'
import { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Info,
  Loader2,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import AppealForm from './AppealForm'
import CreatorWaitlistForm from './CreatorWaitlistForm'

interface AIValidationResultProps {
  organization: schemas['Organization']
  onValidationCompleted?: () => void
  onAppealApproved?: () => void
  onAppealSubmitted?: () => void
}

const AIValidationResult: React.FC<AIValidationResultProps> = ({
  organization,
  onValidationCompleted,
  onAppealApproved,
  onAppealSubmitted,
}) => {
  const startedAtRef = useRef<number>(Date.now())
  const [timedOut, setTimedOut] = useState(false)
  const [stopPolling, setStopPolling] = useState(false)

  const shouldPoll = useMemo(
    () => !timedOut && !stopPolling,
    [timedOut, stopPolling],
  )
  const reviewStatus = useOrganizationReviewStatus(
    organization.id,
    true,
    shouldPoll ? 3000 : undefined,
  )

  // Timeout after 120s and stop polling
  useEffect(() => {
    if (timedOut) return
    const timeout = setTimeout(() => setTimedOut(true), 120_000)
    return () => clearTimeout(timeout)
  }, [timedOut])

  // Stop polling once a verdict is present
  useEffect(() => {
    if (reviewStatus.data?.verdict) {
      setStopPolling(true)
    }
  }, [reviewStatus.data?.verdict])

  const getValidationStatus = () => {
    // If we don't have a verdict yet, show loading while polling
    const verdict = reviewStatus.data?.verdict
    if (!verdict && !timedOut && !reviewStatus.isError) {
      return {
        type: 'loading',
        title: 'Validating Organization Details...',
        message:
          'Our AI is reviewing your organization details against our acceptable use policy. This typically takes one to two minutes.',
        icon: <Loader2 className="h-8 w-8 animate-spin" />,
      }
    }

    // Handle error state with fallback result
    if (reviewStatus.isError || timedOut) {
      return {
        type: 'review_required',
        title: 'Payment Access Denied',
        message:
          'Technical error during validation. Manual review will be conducted.',
        icon: <AlertTriangle className="h-8 w-8 text-gray-600" />,
        severity: 'error',
      }
    }

    const result = reviewStatus.data
    if (!result) {
      return null
    }

    switch (result.verdict) {
      case 'PASS':
        return {
          type: 'pass',
          title: 'AI Validation Successful',
          message:
            'Your organization details have been automatically validated against our acceptable use policy.',
          icon: <CheckCircle className="h-8 w-8 text-gray-600" />,
        }
      case 'FAIL':
      case 'UNCERTAIN':
        return {
          type: 'review_required',
          title: 'Payment Access Denied',
          message: result.reason,
          icon: <AlertTriangle className="h-8 w-8 text-gray-600" />,
          severity: 'error',
        }
      default:
        return null
    }
  }

  const status = getValidationStatus()
  if (!status) return null

  // A country denial (region not enabled yet) routes the creator to the
  // waitlist instead of the standard "Payment Access Denied" + appeal
  // flow. The backend flags this via denial_kind on the review status.
  const isCountryDenial =
    status.type === 'review_required' &&
    reviewStatus.data?.denial_kind === 'country'

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center space-x-4">
          <div className="shrink-0">{status.icon}</div>
          <div className="flex-1">
            <h3 className={`text-lg font-medium`}>
              {isCountryDenial ? 'Creator onboarding coming soon' : status.title}
            </h3>
            <p className="dark:text-polar-400 mt-1 text-sm text-gray-600">
              {isCountryDenial
                ? "We're rolling out creator accounts region by region and aren't open in yours just yet."
                : status.message}
            </p>
          </div>
        </div>

        {/* Information Message */}
        {!isCountryDenial && (
          <Card className={`rounded-lg p-4`}>
            <div className="flex items-start space-x-3">
              <Info className={`dark:text-polar-400 h-5 w-5 text-gray-600`} />
              <div className="flex-1">
                <h4 className={`text-sm font-medium`}>What happens next?</h4>
                <p className={`dark:text-polar-400 mt-1 text-sm text-gray-600`}>
                  {status.type === 'pass'
                    ? 'Your organization details passed our automated compliance check. You can accept payments immediately, but a manual review will still occur before your first payout as part of our standard process.'
                    : status.type === 'review_required'
                      ? 'Payments are currently blocked for your organization due to our compliance review. You can submit an appeal below if you believe this decision is incorrect.'
                      : 'Please wait while we validate your organization details.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Appeal Form for FAIL/UNCERTAIN, Waitlist for country denial, or Continue Button */}
        {((reviewStatus.data && reviewStatus.data.verdict) || timedOut) && (
          <>
            {isCountryDenial ? (
              <div className="pt-6">
                <CreatorWaitlistForm organization={organization} />
              </div>
            ) : status.type === 'review_required' ? (
              <div className="pt-6">
                <AppealForm
                  organization={organization}
                  disabled={false} // Set to true to disable appeals
                  onAppealApproved={onAppealApproved}
                  onContinueAfterSubmission={onAppealSubmitted}
                  existingReviewStatus={reviewStatus.data}
                />
              </div>
            ) : (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={() => {
                    if (onValidationCompleted) {
                      onValidationCompleted()
                    }
                  }}
                  className="w-auto"
                >
                  Continue to Account Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

export default AIValidationResult
