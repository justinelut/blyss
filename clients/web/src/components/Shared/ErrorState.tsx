'use client'

import Button from '@/components/atoms/Button'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  showRetry?: boolean
  className?: string
}

/**
 * Reusable error state component for displaying errors with optional retry functionality
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
  showRetry = true,
  className = '',
}: ErrorStateProps) => {
  return (
    <div
      className={`rounded-lg bg-red-50 p-6 dark:bg-red-950/20 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-medium text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-4"
              aria-label="Retry loading data"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
