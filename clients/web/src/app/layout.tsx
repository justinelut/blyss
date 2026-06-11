import '../styles/globals.css'

import { AnalyticsTag } from '@/components/Analytics/AnalyticsTag'
import { StructuredData } from '@/components/SEO/StructuredData'
import SandboxBanner from '@/components/Sandbox/SandboxBanner'
import { getExperimentNames } from '@/experiments'
import { getDistinctId } from '@/experiments/distinct-id'
import { ExperimentProvider } from '@/experiments/ExperimentProvider'
import { getExperiments } from '@/experiments/server'
import { inter, spaceGrotesk, louize } from '@/fonts/fonts'
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
  // Anti-slop SEO copy. Avoids the LLM tells flagged in
  // .kiro/skills/anti-slop-writing — no "seamless", "modern",
  // "powerful", "flexible", "discover" as promo verb. Concrete:
  // names the product types ("templates, ebooks, beats, presets,
  // courses"), the payment rail ("M-Pesa or card"), the city
  // ("Nairobi"), and the actual creator-payout window ("24 hours").
  // These specifics double as AI-search anchors — Perplexity,
  // Claude Search, and Google SGE pull literal phrases like
  // "Kenyan creators" and "M-Pesa" from descriptions.
  const baseMetadata: Metadata = {
    title: {
      template: '%s · Blyss',
      default: 'Blyss — Kenyan Creator Marketplace · Pay with M-Pesa',
    },
    description:
      "Buy templates, ebooks, beats, presets, and courses from Kenyan creators. Pay with M-Pesa or card. Blyss pays creators within 24 hours. Made in Nairobi.",
    keywords: [
      'digital products Kenya',
      'Kenyan creators',
      'M-Pesa marketplace',
      'buy templates Kenya',
      'ebooks Kenya',
      'beats Kenya',
      'presets Kenya',
      'sell digital products Nairobi',
      'creator economy Kenya',
      'KSh digital products',
    ],
    authors: [{ name: 'Blyss', url: 'https://blyss.co.ke' }],
    publisher: 'Blyss',
    openGraph: {
      images: 'https://blyss.co.ke/og-image.png',
      type: 'website',
      siteName: 'Blyss',
      title: 'Blyss — Kenyan Creator Marketplace · Pay with M-Pesa',
      description:
        "Buy templates, ebooks, beats, presets, and courses from Kenyan creators. Pay with M-Pesa or card. Blyss pays creators within 24 hours.",
      locale: 'en_KE',
      url: 'https://blyss.co.ke/',
    },
    twitter: {
      images: 'https://blyss.co.ke/og-image.png',
      card: 'summary_large_image',
      site: '@blyssmarket',
      title: 'Blyss — Kenyan Creator Marketplace · Pay with M-Pesa',
      description:
        "Templates, ebooks, beats, presets, courses by Kenyan creators. Pay with M-Pesa. Creators paid within 24 hours.",
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
      className={`antialiased ${inter.variable} ${spaceGrotesk.variable} ${louize.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Light is the default, dominant mode (plan/04-ui-direction.md §3.2).
            Dark is reserved for accent sections, opted into by wrapping the
            section in `.dark`. No theme class on <html> = light by default. */}
        {/* JSON-LD — Organization + WebSite schemas for Google rich results
            and AI search engines (Perplexity, Claude Search, ChatGPT Search,
            Google SGE). Static, site-wide. Per-page schemas (Product,
            BreadcrumbList) live on their respective routes. */}
        <StructuredData />
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
        {/* Google Analytics — server-rendered after the app tree so the
            measurement-ID fetch can't block paint. Renders nothing when
            unset or in sandbox. Configure via backoffice runtime_settings
            (key: GA_MEASUREMENT_ID). */}
        <AnalyticsTag />
      </body>
    </html>
  )
}
