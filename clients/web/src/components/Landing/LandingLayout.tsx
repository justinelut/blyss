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
import { ComponentProps, PropsWithChildren, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { AuthModal } from '../Auth/AuthModal'
import GetStartedButton from '../Auth/GetStartedButton'
import { Modal } from '../Modal'
import { useModal } from '../Modal/useModal'
import { NavPopover, NavPopoverSection } from './NavPopover'
import { useCartStore } from '@/stores/cartStore'

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
  const { itemCount, refreshCart } = useCartStore()

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const onLoginClick = () => {
    posthog.capture('global:user:login:click')
    showModal()
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-[#fcf9f7] backdrop-blur-xl dark:bg-stone-950/80">
      <nav className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-8">
        <Link href="/">
          <div className="font-['Epilogue'] text-xl font-bold tracking-tight text-[#1b1c1b] dark:text-[#fcf9f7]">
            Blyss
          </div>
        </Link>

        <div className="hidden items-center space-x-8 font-['Epilogue'] text-sm tracking-tight md:flex">
          <Link
            href="/products"
            className={`pb-1 transition-colors duration-200 ${
              pathname === '/products'
                ? 'border-b-2 border-[#a73400] text-[#a73400]'
                : 'text-[#594139] hover:text-[#a73400] dark:text-stone-400'
            }`}
          >
            Explore
          </Link>
          <Link
            href="/creators"
            className={`pb-1 transition-colors duration-200 ${
              pathname === '/creators'
                ? 'border-b-2 border-[#a73400] text-[#a73400]'
                : 'text-[#594139] hover:text-[#a73400] dark:text-stone-400'
            }`}
          >
            Creators
          </Link>
          <Link
            href="/subscriptions"
            className={`pb-1 transition-colors duration-200 ${
              pathname === '/subscriptions'
                ? 'border-b-2 border-[#a73400] text-[#a73400]'
                : 'text-[#594139] hover:text-[#a73400] dark:text-stone-400'
            }`}
          >
            Subscriptions
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/cart">
            <button className="relative scale-90 text-[#594139] transition-transform hover:text-[#a73400] active:opacity-80">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#a73400] text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </Link>
          <button
            onClick={onLoginClick}
            className="scale-90 text-[#594139] transition-transform hover:text-[#a73400] active:opacity-80"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        </div>
      </nav>
      <Modal
        title="Login"
        isShown={isModalShown}
        hide={hideModal}
        modalContent={<AuthModal />}
        className="lg:w-full lg:max-w-[480px]"
      />
    </header>
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
