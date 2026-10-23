import "../styles/globals.css";

import { AnalyticsTag } from "@/components/Analytics/AnalyticsTag";
import { StructuredData } from "@/components/SEO/StructuredData";
import SandboxBanner from "@/components/Sandbox/SandboxBanner";
import { getExperimentNames } from "@/experiments";
import { getDistinctId } from "@/experiments/distinct-id";
import { ExperimentProvider } from "@/experiments/ExperimentProvider";
import { getExperiments } from "@/experiments/server";
import { inter, spaceGrotesk, louize, geistMono } from "@/fonts/fonts";
import { UserContextProvider } from "@/providers/auth";
import { getServerSideAPI } from "@/utils/client/serverside";
import { CONFIG } from "@/utils/config";
import { getAuthenticatedUser, getUserOrganizations } from "@/utils/user";
import { schemas } from "@/lib/api";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { Metadata } from "next/types";
import {
  NavigationHistoryProvider,
  BlyssAnalyticsProvider,
  BlyssQueryClientProvider,
} from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  // Anti-slop SEO copy. Avoids the LLM tells flagged in
  // .kiro/skills/anti-slop-writing — no "seamless", "modern",
  // "powerful", "flexible", "discover" as promo verb. Concrete:
  // names the marketplace and local payment options without promising
  // availability or settlement timing that can vary by transaction.
  // Root metadata. The template `'%s · Blyss'` means every page-
  // level `title: 'Foo'` is rendered as `Foo · Blyss` in the browser
  // tab. Page-level titles must NOT include 'Blyss' themselves or
  // the suffix doubles. The default below is what shows when a child
  // page has no title of its own.
  //
  // Keep meta locale-neutral so the site reads outside Kenya. The
  // soft-launch market is still Kenyan creators selling to Kenyan
  // buyers, but buyers in NG / ZA / GH / global also land here from
  // search and shouldn't see "Kenyan creator" stamped everywhere.
  const baseMetadata: Metadata = {
    title: {
      template: "%s · Blyss",
      default:
        "Blyss — Digital products from Kenyan creators · Templates, ebooks, beats, presets, courses",
    },
    description:
      "A Kenya-focused marketplace for digital products and subscriptions. Browse independent creators and pay with the methods shown at checkout, including M-Pesa and cards where available.",
    keywords: [
      // Kenyan-context (top autocomplete intents — research 2026-06-26)
      "digital products kenya",
      "sell digital products kenya",
      "buy ebooks kenya",
      "m-pesa shop",
      "side hustle kenya",
      "make money online kenya",
      "kenyan creator economy",
      "online courses kenya",
      "kenyan music producers",
      // Buyer-side (global)
      "buy notion templates",
      "buy lightroom presets",
      "wedding lightroom presets",
      "buy beats online",
      "social media templates",
      "instagram canva templates",
      "royalty free music",
      "fonts for commercial use",
      "instant download digital",
      // Category framing
      "digital products marketplace",
      "creator marketplace",
      "independent creators",
    ],
    authors: [{ name: "Blyss", url: "https://blyss.co.ke" }],
    publisher: "Blyss",
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
    openGraph: {
      images: [
        {
          url: "https://blyss.co.ke/blyss-og-image.png",
          width: 1200,
          height: 630,
          alt: "Blyss, a marketplace for Kenyan creators",
        },
      ],
      type: "website",
      siteName: "Blyss",
      title: "Blyss — Digital products from Kenyan creators",
      description:
        "Browse digital products and subscriptions from independent creators. Available payment methods and delivery details are shown on each listing and at checkout.",
      url: "https://blyss.co.ke/",
      locale: "en_KE",
    },
    twitter: {
      images: ["https://blyss.co.ke/blyss-og-image.png"],
      card: "summary_large_image",
      title: "Blyss — Digital products from Kenyan creators",
      description:
        "Browse digital products and subscriptions from independent creators on Blyss.",
    },
    metadataBase: new URL("https://blyss.co.ke/"),
    alternates: {
      canonical: "https://blyss.co.ke/",
    },
  };

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
    };
  }

  return {
    ...baseMetadata,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  const api = await getServerSideAPI();

  let authenticatedUser: schemas["UserRead"] | undefined = undefined;
  let userOrganizations: schemas["Organization"][] = [];

  try {
    authenticatedUser = await getAuthenticatedUser();
    userOrganizations = await getUserOrganizations(api);
  } catch (e) {
    // Silently swallow errors during build, typically when rendering static pages

    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
      throw e;
    }
  }

  const distinctId = await getDistinctId();
  const experimentVariants = await getExperiments(getExperimentNames(), {
    distinctId,
  });

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`antialiased ${inter.variable} ${spaceGrotesk.variable} ${louize.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Resource hints — open the TCP + TLS handshake to the
            domains we WILL hit early so the LCP image and first API
            call don't wait on a cold connection. cdn is critical
            (hero + product imagery); api is for SSR data the client
            re-validates. dns-prefetch is the cheap fallback for the
            other origins. */}
        <link
          rel="preconnect"
          href="https://cdn.blyss.co.ke"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://api.blyss.co.ke"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://cdn.blyss.co.ke" />
        <link rel="dns-prefetch" href="https://api.blyss.co.ke" />
        {/* The shared theme provider defaults to dark and applies the user's
            saved light/dark preference on <html>. */}
        {/* JSON-LD — Organization + WebSite schemas for Google rich results
            and AI search engines (Perplexity, Claude Search, ChatGPT Search,
            Google SGE). Static, site-wide. Per-page schemas (Product,
            BreadcrumbList) live on their respective routes. */}
        <StructuredData />
      </head>
      <body
        style={{
          textRendering: "optimizeLegibility",
        }}
      >
        <ExperimentProvider experiments={experimentVariants}>
          <UserContextProvider
            user={authenticatedUser}
            userOrganizations={userOrganizations}
          >
            <BlyssAnalyticsProvider distinctId={distinctId}>
              <BlyssQueryClientProvider>
                <NavigationHistoryProvider>
                  {CONFIG.IS_SANDBOX && <SandboxBanner />}
                  {children}
                </NavigationHistoryProvider>
              </BlyssQueryClientProvider>
            </BlyssAnalyticsProvider>
          </UserContextProvider>
        </ExperimentProvider>
        {/* Google Analytics — server-rendered after the app tree so the
            measurement-ID fetch can't block paint. Renders nothing when
            unset or in sandbox. Configure via backoffice runtime_settings
            (key: GA_MEASUREMENT_ID). */}
        <AnalyticsTag />
      </body>
    </html>
  );
}
