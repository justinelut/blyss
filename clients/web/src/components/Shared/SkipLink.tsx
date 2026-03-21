/**
 * SkipLink component for accessibility
 * Allows keyboard users to skip directly to main content
 * Requirement 15.7: Provide skip links to main content
 */

interface SkipLinkProps {
  href?: string
  children?: React.ReactNode
}

export const SkipLink = ({
  href = '#main-content',
  children = 'Skip to main content',
}: SkipLinkProps) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2"
    >
      {children}
    </a>
  )
}
