'use client'

import { Logo } from '@/components/Brand/Logo'
import { OrganizationContext } from '@/providers/maintainerOrganization'
import { setLastVisitedOrg } from '@/utils/cookies'
import { schemas } from '@/lib/api'
import {
  SidebarTrigger,
  useSidebar,
} from '@/components/atoms/Sidebar'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/Tabs'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { motion } from 'motion/react'
import Link from 'next/link'
import {
  PropsWithChildren,
  useContext,
  useEffect,
  type JSX,
} from 'react'
import { twMerge } from 'tailwind-merge'
import { DashboardProvider } from '../Dashboard/DashboardProvider'
import { SubRouteWithActive } from '../Dashboard/navigation'
import { useRoute } from '../Navigation/useRoute'
import { DashboardSidebar } from './Dashboard/DashboardSidebar'

const DashboardLayout = (
  props: PropsWithChildren<{
    type?: 'organization' | 'account'
    className?: string
  }>,
) => {
  const { organization, organizations } = useContext(OrganizationContext)

  useEffect(() => {
    if (organization) {
      setLastVisitedOrg(organization.slug)
    }
  }, [organization])

  return (
    <DashboardProvider organization={organization}>
      <div className="relative flex h-full w-full flex-col bg-white md:flex-row md:bg-[var(--surface)] md:p-2 dark:bg-transparent">
        <MobileTopbar
          organization={organization}
          organizations={organizations ?? []}
          type={props.type}
        />
        {/* Sidebar — shadcn `<Sidebar>` internally renders an inline
            aside on desktop and a Sheet drawer on mobile via
            useIsMobile(). Always mounted; the responsive switch is
            handled by the component itself, not by us hiding it
            with `md:flex` wrappers (which prevented mobile from ever
            getting an actual drawer). */}
        <DashboardSidebar
          organization={organization}
          organizations={organizations ?? []}
          type={props.type}
        />
        <div
          className={twMerge(
            'relative flex h-full w-full min-w-0 flex-col',
            props.className,
          )}
        >
          {/* On large devices, scroll here. On small devices the _document_ is the only element that should scroll. */}
          <main className="relative flex min-h-0 min-w-0 grow flex-col">
            {props.children}
          </main>
        </div>
      </div>
    </DashboardProvider>
  )
}

export default DashboardLayout

/**
 * Mobile-only topbar — Blyss logo + storefront quick-link + sidebar
 * trigger. Hidden on md+ where the inline DashboardSidebar provides the
 * navigation surface natively. The trigger uses shadcn's
 * `useSidebar()` openMobile state to toggle the Sheet drawer that
 * <Sidebar> renders for mobile.
 *
 * Why no account dropdown here:
 * - Creators sign out / switch orgs from the SidebarFooter inside the
 *   drawer (one tap on the trigger reveals it). Duplicating those
 *   controls in the topbar created two competing entry points and
 *   pushed the storefront jump-to off the screen on small phones.
 * - Notifications also live in the sidebar header, surfaced by the
 *   same drawer.
 * Result: the topbar only carries the two highest-frequency mobile
 * actions — open my storefront, open the nav drawer.
 */
const MobileTopbar = ({
  type = 'organization',
  organization,
  organizations,
}: {
  type?: 'organization' | 'account'
  organization?: schemas['Organization']
  organizations: schemas['Organization'][]
}) => {
  const storefrontHref =
    type === 'organization' && organization?.slug
      ? `/creators/${organization.slug}`
      : null

  return (
    <div className="dark:bg-polar-900 sticky top-0 z-30 flex w-full flex-row items-center justify-between bg-[var(--surface)] p-4 md:hidden">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="shrink-0 items-center font-semibold text-black dark:text-white"
      >
        <Logo variant="icon" className="h-10 w-10" size="md" />
      </a>

      <div className="flex flex-row items-center gap-x-4">
        {storefrontHref && (
          <Link
            href={storefrontHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open my storefront in a new tab"
            className={twMerge(
              'flex h-10 w-10 items-center justify-center rounded-md',
              'text-[var(--text-secondary)] transition-colors',
              'hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
              'dark:text-polar-300 dark:hover:bg-polar-800 dark:hover:text-white',
            )}
          >
            <StorefrontOutlined fontSize="medium" />
          </Link>
        )}
        <SidebarTrigger />
      </div>
    </div>
  )
}

const SubNav = (props: { items: SubRouteWithActive[] }) => {
  const current = props.items.find((i) => i.isActive)

  return (
    <Tabs value={current?.title}>
      <TabsList className="flex flex-row bg-transparent ring-0 dark:bg-transparent dark:ring-0">
        {props.items.map((item) => {
          return (
            <Link key={item.title} href={item.link} prefetch={true}>
              <TabsTrigger
                className="flex flex-row items-center gap-x-2 px-4"
                value={item.title}
              >
                <h3>{item.title}</h3>
              </TabsTrigger>
            </Link>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

export interface DashboardBodyProps {
  children?: React.ReactNode
  className?: string
  wrapperClassName?: string
  title?: JSX.Element | string | null
  contextView?: React.ReactNode
  contextViewClassName?: string
  contextViewPlacement?: 'left' | 'right'
  header?: JSX.Element
  wide?: boolean
}

export const DashboardBody = ({
  children,
  className,
  wrapperClassName,
  title,
  contextView,
  contextViewClassName,
  contextViewPlacement = 'right',
  header,
  wide = false,
}: DashboardBodyProps) => {
  const { currentRoute, currentSubRoute } = useRoute()

  const { state } = useSidebar()

  const isCollapsed = state === 'collapsed'

  const current = currentSubRoute ?? currentRoute

  const parsedTitle = title ?? current?.title

  return (
    <motion.div
      className={twMerge(
        'flex h-full w-full flex-row gap-x-2',
        contextViewPlacement === 'left' ? 'flex-row-reverse' : '',
      )}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="dark:bg-polar-900 dark:border-polar-800 relative flex min-w-0 flex-2 flex-col items-center rounded-2xl border-[var(--border)] bg-white px-4 md:overflow-y-auto md:border md:px-8 md:shadow-xs">
        <div
          className={twMerge(
            'flex h-full w-full flex-col gap-8 pt-8',
            wrapperClassName,
            wide ? '' : 'max-w-(--breakpoint-xl)',
          )}
        >
          {(title !== null || !!header) && (
            <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-x-4">
              {title !== null &&
                (!title || typeof parsedTitle === 'string' ? (
                  <h4 className="text-2xl font-medium whitespace-nowrap dark:text-white">
                    {title ?? current?.title}
                  </h4>
                ) : (
                  parsedTitle
                ))}

              {header ? (
                header
              ) : isCollapsed && currentRoute && 'subs' in currentRoute ? (
                <SubNav items={currentRoute.subs ?? []} />
              ) : null}
            </div>
          )}

          <motion.div
            className={twMerge('flex w-full flex-col pb-8', className)}
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1, transition: { duration: 0.3 } },
              exit: { opacity: 0, transition: { duration: 0.3 } },
            }}
          >
            {children}
          </motion.div>
        </div>
      </div>
      {contextView ? (
        <motion.div
          variants={{
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.3 } },
            exit: { opacity: 0, transition: { duration: 0.3 } },
          }}
          className={twMerge(
            'dark:bg-polar-900 dark:border-polar-800 w-full flex-1 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white md:max-w-[320px] md:shadow-xs xl:max-w-[440px]',
            contextViewClassName,
          )}
        >
          {contextView}
        </motion.div>
      ) : null}
    </motion.div>
  )
}
