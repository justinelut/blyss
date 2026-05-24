import { typography } from './typography'
import { cn } from '@/lib/utils'

interface EyebrowProps {
  /** When true, renders in --accent color (used on hero); otherwise --text-muted */
  accent?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Eyebrow — small uppercase tracked label. Used as a section opener.
 * Per plan §3.3:  Inter 600, 11px, uppercase, letter-spacing 0.14em.
 *
 *   <Eyebrow>What's selling</Eyebrow>
 *   <Eyebrow accent>Digital products · Nairobi</Eyebrow>
 */
export const Eyebrow = ({ accent, className, children }: EyebrowProps) => {
  return (
    <span
      className={cn(
        accent ? typography.eyebrowAccent : typography.eyebrow,
        className,
      )}
    >
      {children}
    </span>
  )
}
