import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Blyss Button — marketplace-surface primitive locked to plan §3.4.
 *
 * Separate from the shared shadcn `components/ui/button.tsx` (which the
 * dashboard depends on) so marketplace styling can be guaranteed without
 * risking dashboard regressions.
 *
 * - primary:     filled --accent, radius 8px, padding 14px 28px, weight 500, NO shadow
 * - secondary:   transparent + 1px --border-strong, hover fills --surface-sunken
 * - ghost:       text only, underline on hover
 * - destructive: --danger text on transparent, hover fills --danger @ 8%
 * - icon:        40x40 transparent, hover --surface-sunken
 * Loading sets aria-busy and swaps label for a spinner while keeping width.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]',
        secondary:
          'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
        ghost:
          'bg-transparent text-[var(--text-primary)] underline-offset-4 hover:underline',
        destructive:
          'bg-transparent text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]',
        icon: 'h-10 w-10 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
      },
      size: {
        default: 'px-7 py-[14px] text-[15px]',
        sm: 'px-4 py-2 text-[14px]',
        lg: 'px-8 py-4 text-[16px]',
        icon: 'p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = ({
  ref,
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps & { ref?: React.RefObject<HTMLButtonElement> }) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        children
      )}
    </Comp>
  )
}
Button.displayName = 'BlyssButton'
