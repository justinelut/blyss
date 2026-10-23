import { BlyssLogo } from '@/design'

/**
 * Renders the canonical Blyss wordmark for public navigation.
 */
export const BlyssLogotype = (props: { size?: number; className?: string }) => (
  <BlyssLogo
    size={props.size && props.size > 36 ? 'xl' : 'lg'}
    className={props.className}
  />
)
