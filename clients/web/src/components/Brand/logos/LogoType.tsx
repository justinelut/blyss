import { BlyssLogo } from '@/design'

interface LogoTypeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
  style?: React.CSSProperties
}

/**
 * LogoType — wordmark form of the Blyss logo. Wraps the canonical BlyssLogo
 * with a few legacy-API niceties (numeric `size`) so existing call sites that
 * imported the old Polar `LogoType` keep working.
 */
export default function LogoType({ size, className }: LogoTypeProps) {
  // Accept legacy numeric sizes from old Polar callers and map them to the
  // closest BlyssLogo size token.
  const mappedSize: 'sm' | 'md' | 'lg' | 'xl' =
    typeof size === 'number'
      ? size >= 36
        ? 'xl'
        : size >= 24
          ? 'lg'
          : size >= 18
            ? 'md'
            : 'sm'
      : (size ?? 'md')

  return <BlyssLogo size={mappedSize} className={className} asPlainText />
}

export { LogoType }
