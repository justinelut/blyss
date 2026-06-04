import Link from 'next/link'
import LogoIcon from './logos/LogoIcon'
import { BlyssLogo } from '@/design'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** Wrap in a Next.js Link — defaults to the marketplace home */
  href?: string
  /** 'icon' = mark only, 'wordmark' = text only, 'lockup' = mark + wordmark */
  variant?: 'icon' | 'wordmark' | 'lockup'
  /** Wordmark size token */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Skip the link wrapper (when used inside another anchor) */
  asPlainText?: boolean
  className?: string
}

const ICON_PX: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 20,
  md: 24,
  lg: 28,
  xl: 36,
}

/**
 * Logo — the canonical Blyss brand element.
 *
 * Three rendered forms:
 *   - `icon`     → just the geometric B mark on the charcoal tile
 *   - `wordmark` → "Blyss" wordmark with the orange signature dot
 *   - `lockup`   → mark to the left of the wordmark (the default)
 *
 * Replaces the previous one-line stub that rendered raw orange text and
 * nothing else.
 */
export const Logo = ({
  href = '/',
  variant = 'lockup',
  size = 'md',
  asPlainText,
  className,
}: LogoProps) => {
  const inner = (() => {
    if (variant === 'icon') {
      return <LogoIcon size={ICON_PX[size]} className={className} />
    }
    if (variant === 'wordmark') {
      return <BlyssLogo size={size} className={className} asPlainText />
    }
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <LogoIcon size={ICON_PX[size]} />
        <BlyssLogo size={size} asPlainText />
      </span>
    )
  })()

  if (asPlainText) return inner

  return (
    <Link
      href={href}
      aria-label="Blyss — go to homepage"
      className="inline-flex items-center"
    >
      {inner}
    </Link>
  )
}

export default Logo
