import { BlyssLogo } from '@/design'

/**
 * PolarLogotype — legacy export name kept for compatibility with Polar code
 * paths that still import it. Renders the canonical Blyss wordmark.
 */
export const PolarLogotype = (props: { size?: number; className?: string }) => (
  <BlyssLogo
    size={props.size && props.size > 36 ? 'xl' : 'lg'}
    className={props.className}
  />
)
