import { PropsWithChildren } from 'react'

/**
 * /creators/* layout — chrome (header + footer) is inherited from
 * (main)/layout.tsx via MarketplaceShell. Passthrough kept for clarity.
 */
export default function CreatorsLayout({ children }: PropsWithChildren) {
  return <>{children}</>
}
