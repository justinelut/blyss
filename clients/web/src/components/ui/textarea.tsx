import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = ({
  ref,
  className,
  ...props
}: React.ComponentProps<'textarea'>) => {
  return (
    <textarea
      className={cn(
        'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[var(--accent)]/40 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
