'use client'

import { PolarLogotype } from '@/components/Layout/Public/PolarLogotype'
import Footer from '@/components/Organization/Footer'
import { usePostHog } from '@/hooks/posthog'
import Button from '@/components/atoms/Button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/atoms/Sidebar'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ComponentProps, PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import { AuthModal } from '../Auth/AuthModal'
import GetStartedButton from '../Auth/GetStartedButton'
import { Modal } from '../Modal'
import { useModal } from '../Modal/useModal'
import { NavPopover, NavPopoverSection } from './NavPopover'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="dark:bg-polar-950 relative flex flex-col bg-white px-0 md:w-full md:flex-1 md:items-center md:px-4">
      <div className="flex flex-col gap-y-2 md:w-full">
        <LandingPageDesktopNavigation />
        <SidebarProvider className="absolute inset-0 flex flex-col items-start md:hidden">
          <LandingPageTopbar />
          <LandingPageMobileNavigation />
        </SidebarProvider>
        <div className="dark:bg-polar-950 relative flex flex-col px-4 pt-32 md:w-full md:px-0 md:pt-0">
          {children}
        </div>
        <LandingPageFooter />
      </div>
    </div>
  )
}

const NavLink = ({
  href,
  className,
  children,
  isActive: _isActive,
  target,
  ...props
}: ComponentProps<typeof Link> & {
  isActive?: (pathname: string) => boolean
}) => {
  const pathname = usePathname()
  const isActive = _isActive
    ? _isActive(pathname)
    : pathname.startsWith(href.toString())
  const isExternal = href.toString().startsWith('http')

  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : target}
      prefetch
      className={twMerge(
        'dark:text-polar-500 -m-1 flex items-center gap-x-2 p-1 text-gray-500 transition-colors hover:text-black dark:hover:text-white',
        isActive && 'text-black dark:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

interface NavigationItem {
  title: string
  href: string
  isActive?: (pathname: string) => boolean
  target?: '_blank'
}

const mobileNavigationItems: NavigationItem[] = [
  {
    title: 'Home',
    href: '/',
    isActive: (pathname) => pathname === '/',
  },
  {
    title: 'Marketplace',
    href: '/marketplace',
  },
  {
    title: 'Categories',
    href: '/category',
  },
  {
    title: 'Creators',
    href: '/creators',
  },
  {
    title: 'Blog',
    href: '/blog',
  },
  {
    title: 'Company',
    href: '/company',
  },
  {
    title: 'Resources',
    href: '/resources',
  },
]

const LandingPageMobileNavigation = () => {
  const sidebar = useSidebar()

  const posthog = usePostHog()
  const { isShown: isModalShown, hide: hideModal, show: showModal } = useModal()

  const onLoginClick = () => {
    posthog.capture('global:user:login:click')
    sidebar.toggleSidebar()
    showModal()
  }

  return (
    <>
      <Sidebar className="md:hidden">
        <SidebarHeader className="p-4">
          <Link href="/">
            <PolarLogotype logoVariant="icon" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex flex-col gap-y-6 px-6 py-2">
          <div className="flex flex-col gap-y-1">
            {mobileNavigationItems.map((item) => {
              return (
                <NavLink
                  key={item.title}
                  className="text-xl tracking-tight"
                  isActive={item.isActive}
                  target={item.target}
                  href={item.href}
                  onClick={sidebar.toggleSidebar}
                >
                  {item.title}
                </NavLink>
              )
            })}
          </div>
          <NavLink
            href="#"
            onClick={onLoginClick}
            className="text-xl tracking-tight"
          >
            Login
          </NavLink>
        </SidebarContent>
      </Sidebar>
      <Modal
        title="Login"
        isShown={isModalShown}
        hide={hideModal}
        modalContent={<AuthModal />}
        className="lg:w-full lg:max-w-[480px]"
      />
    </>
  )
}

const LandingPageDesktopNavigation = () => {
  const posthog = usePostHog()
  const { isShown: isModalShown, hide: hideModal, show: showModal } = useModal()
  const pathname = usePathname()

  const onLoginClick = () => {
    posthog.capture('global:user:login:click')
    showModal()
  }

  const featuresSections: NavPopoverSection[] = [
    {
      items: [
        {
          href: '/marketplace',
          label: 'Browse Marketplace',
          subtitle: 'Discover digital products',
        },
        {
          href: '/category',
          label: 'Categories',
          subtitle: 'Browse by category',
        },
        {
          href: '/creators',
          label: 'Featured Creators',
          subtitle: 'Top sellers & creators',
        },
        {
          href: '/downloads',
          label: 'Downloads',
          subtitle: 'Digital downloads',
        },
        {
          href: '/features',
          label: 'Platform Features',
          subtitle: 'For buyers & sellers',
        },
      ],
    },
  ]

  const docsSections: NavPopoverSection[] = [
    {
      title: 'For Buyers',
      items: [
        {
          href: '/marketplace',
          label: 'Browse Products',
        },
        {
          href: '/cart',
          label: 'Shopping Cart',
        },
        {
          href: '/wishlist',
          label: 'Wishlist',
        },
      ],
    },
    {
      title: 'For Creators',
      items: [
        {
          href: '/start',
          label: 'Become a Creator',
          subtitle: 'Start selling today',
        },
        {
          href: '/resources',
          label: 'Creator Resources',
          subtitle: 'Guides & tutorials',
        },
        {
          href: 'https://polar.sh/docs',
          label: 'Documentation',
          subtitle: 'Technical docs',
          target: '_blank',
        },
      ],
    },
  ]

  return (
    <div className="dark:text-polar-50 dark:bg-polar-950 sticky top-0 z-10 hidden w-full flex-col items-center gap-12 bg-white py-8 md:flex">
      <div className="relative flex w-full flex-row items-center justify-between lg:max-w-7xl">
        <Link href="/">
          <PolarLogotype logoVariant="icon" size={40} />
        </Link>

        <ul className="absolute left-1/2 mx-auto flex -translate-x-1/2 flex-row gap-x-8 font-medium">
          <li>
            <NavPopover
              trigger="Browse"
              sections={featuresSections}
              isActive={
                pathname.startsWith('/marketplace') ||
                pathname.startsWith('/category')
              }
            />
          </li>
          <li>
            <NavPopover
              trigger="Resources"
              sections={docsSections}
              layout="flex"
            />
          </li>
          <li>
            <NavLink href="/creators">Creators</NavLink>
          </li>
          <li>
            <NavLink href="/blog">Blog</NavLink>
          </li>
          <li>
            <NavLink href="/company">Company</NavLink>
          </li>
        </ul>

        <div className="flex flex-row items-center gap-x-4">
          <Button
            onClick={onLoginClick}
            variant="ghost"
            className="rounded-full"
          >
            Log In
          </Button>
          <GetStartedButton size="default" />
        </div>
      </div>
      <Modal
        title="Login"
        isShown={isModalShown}
        hide={hideModal}
        modalContent={<AuthModal />}
        className="lg:w-full lg:max-w-[480px]"
      />
    </div>
  )
}

const LandingPageTopbar = () => {
  return (
    <div className="z-30 flex w-full flex-row items-center justify-between px-6 py-6 md:hidden md:px-12">
      <PolarLogotype
        className="mt-1 ml-2 md:hidden"
        logoVariant="logotype"
        size={100}
      />
      <SidebarTrigger className="md:hidden" />
    </div>
  )
}

const LandingPageFooter = () => {
  return (
    <motion.div
      initial="initial"
      className="relative flex w-full flex-col items-center"
      variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      whileInView="animate"
      viewport={{ once: true }}
    >
      <Footer />
    </motion.div>
  )
}
