'use client'

import React from 'react'
import { twMerge } from 'tailwind-merge'
import Button from '../atoms/Button'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        'dark:bg-polar-900 flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800',
        className,
      )}
    >
      {icon && <div className="text-gray-400 dark:text-gray-600">{icon}</div>}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
