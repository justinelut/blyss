import '../styles/globals.css'

import SandboxBanner from '@/components/Sandbox/SandboxBanner'
import { getExperimentNames } from '@/experiments'
import { getDistinctId } from '@/experiments/distinct-id'
import { ExperimentProvider } from '@/experiments/ExperimentProvider'
import { getExperiments } from '@/experiments/server'
import { inter, interDisplay, louize } from '@/fonts/fonts'
import { UserContextProvider } from '@/providers/auth'
import { getServerSideAPI } from '@/utils/client/serverside'
import { CONFIG } from '@/utils/config'
import { getAuthenticatedUser, getUserOrganizations } from '@/utils/user'
import { schemas } from '@/lib/api'
import { GeistMono } from 'geist/font/mono'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { Metadata } from 'next/types'
import {
  NavigationHistoryProvider,
  PolarNuqsProvider,
  PolarPostHogProvider,
  PolarQueryClientProvider,
} from './providers'

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata: Metadata = {
    title: {
      template: '%s | Blyss',
      default: 'Blyss - Digital Marketplace for Kenyan Creators',
    },
    description:
      'Discover and sell digital products on Blyss, the marketplace for Kenyan creators. Flexible pricing, seamless payments, and powerful tools for digital commerce.',
    openGraph: {
      images: 'https://blyss.co.ke/og-image.png',
      type: 'website',
      siteName: 'Blyss',
      title: 'Blyss - Digital Marketplace for Kenyan Creators',
      description:
        'Discover and sell digital products on Blyss, the marketplace for Kenyan creators. Flexible pricing, seamless payments, and powerful tools for digital commerce.',
      locale: 'en_US',
    },
    twitter: {
      images: 'https://blyss.co.ke/og-image.png',
      card: 'summary_large_image',
      title: 'Blyss - Digital Marketplace for Kenyan Creators',
      description:
        'Discover and sell digital products on Blyss, the marketplace for Kenyan creators. Flexible pricing, seamless payments, and powerful tools for digital commerce.',
    },
    metadataBase: new URL('https://blyss.co.ke/'),
    alternates: {
      canonical: 'https://blyss.co.ke/',
    },
  }

  // Environment-specific metadata
  if (CONFIG.IS_SANDBOX) {
    return {
      ...baseMetadata,
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    }
  }

  return {
    ...baseMetadata,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  const api = await getServerSideAPI()

  let authenticatedUser: schemas['UserRead'] | undefined = undefined
  let userOrganizations: schemas['Organization'][] = []

  try {
    authenticatedUser = await getAuthenticatedUser()
    userOrganizations = await getUserOrganizations(api)
  } catch (e) {
    // Silently swallow errors during build, typically when rendering static pages

    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
      throw e
    }
  }

  const distinctId = await getDistinctId()
  const experimentVariants = await getExperiments(getExperimentNames(), {
    distinctId,
  })

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`antialiased ${inter.variable} ${interDisplay.variable} ${louize.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Light is the default, dominant mode (plan/04-ui-direction.md §3.2).
            Dark is reserved for accent sections, opted into by wrapping the
            section in `.dark`. No theme class on <html> = light by default. */}
      </head>
      <body
        style={{
          textRendering: 'optimizeLegibility',
        }}
      >
        <ExperimentProvider experiments={experimentVariants}>
          <UserContextProvider
            user={authenticatedUser}
            userOrganizations={userOrganizations}
          >
            <PolarPostHogProvider distinctId={distinctId}>
              <PolarQueryClientProvider>
                <PolarNuqsProvider>
                  <NavigationHistoryProvider>
                    {CONFIG.IS_SANDBOX && <SandboxBanner />}
                    {children}
                  </NavigationHistoryProvider>
                </PolarNuqsProvider>
              </PolarQueryClientProvider>
            </PolarPostHogProvider>
          </UserContextProvider>
        </ExperimentProvider>
      </body>
    </html>
  )
}
