import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Blyss Input — marketplace-surface primitive locked to plan §3.4.
 *
 * - background --surface-sunken, NO border by default
 * - 1px bottom border --border-strong on focus only, radius 6px
 * - label ALWAYS above (never placeholder-as-label)
 * - error below in --danger; helper in --text-muted 13px
 * Separate from shared shadcn `components/ui/input.tsx` (dashboard depends).
 */
export interface InputProps extends React.ComponentProps<'input'> {
  label: string
  helper?: string
  error?: string
}

export const Input = ({
  ref,
  className,
  id,
  label,
  helper,
  error,
  type,
  ...props
}: InputProps & { ref?: React.RefObject<HTMLInputElement> }) => {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const helperId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-sans text-[13px] font-medium text-[var(--text-primary)]"
      >
        {label}
      </label>
      {helper && (
        <span id={helperId} className="font-sans text-[13px] text-[var(--text-muted)]">
          {helper}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(errorId, helperId) || undefined}
        className={cn(
          'w-full rounded-[6px] border-0 border-b border-b-transparent bg-[var(--surface-sunken)] px-3 py-2.5 font-sans text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-b-[var(--border-strong)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-b-[var(--danger)]',
          className,
        )}
        {...props}
      />
      {error && (
        <span id={errorId} className="font-sans text-[13px] text-[var(--danger)]">
          {error}
        </span>
      )}
    </div>
  )
}
Input.displayName = 'BlyssInput'
