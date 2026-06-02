import { PropsWithChildren } from 'react'

/**
 * Marketplace landing layout — chrome (header + footer) is inherited from
 * (main)/layout.tsx via MarketplaceShell. This layout is now a passthrough
 * but kept so route grouping stays explicit.
 */
export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>
}
