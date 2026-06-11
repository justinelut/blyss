/**
 * AnalyticsTag — server component that mounts GA4 via @next/third-parties.
 *
 * Fetches the public measurement ID from
 * /v1/integrations/google-analytics/public-config (set in the backoffice
 * runtime_settings UI under category=other, key=GA_MEASUREMENT_ID).
 *
 * Renders nothing when no ID is configured — analytics is opt-in per
 * deployment, so staging stays clean and we don't ship gtag.js to
 * users who can't be measured anyway.
 *
 * Why server-side fetch (not a client query):
 * - The script tag has to render in the initial HTML so GA can attribute
 *   the first pageview without a hydration delay.
 * - The endpoint is public, edge-cacheable, and called once per request.
 * - Avoids a client useQuery + Suspense dance for a value that almost
 *   never changes between deploys.
 *
 * Why @next/third-parties (not raw <Script>):
 * - It implements the GA-recommended async/defer ordering, deduplicates
 *   when remounted, and is the documented Next.js 16 pattern.
 * - Already in package.json (@next/third-parties@16.2.0).
 */

import { GoogleAnalytics } from '@next/third-parties/google'
import { CONFIG } from '@/utils/config'

interface AnalyticsConfig {
  measurement_id: string
}

async function fetchMeasurementId(): Promise<string> {
  // CONFIG.BASE_URL points at the API origin (e.g. https://api.blyss.co.ke).
  // We deliberately bypass the typed openapi client here — the layout
  // shouldn't depend on the auth-bearing server-side API setup, and a
  // single fetch keeps server-component bundle weight minimal.
  try {
    const res = await fetch(
      `${CONFIG.BASE_URL}/v1/integrations/google-analytics/public-config`,
      {
        // Cache for 5 minutes at the edge — re-fetch picks up
        // backoffice-driven measurement-ID changes within minutes.
        next: { revalidate: 300 },
      },
    )
    if (!res.ok) return ''
    const data = (await res.json()) as AnalyticsConfig
    return (data.measurement_id || '').trim()
  } catch {
    // Layout must never crash because analytics is unavailable.
    return ''
  }
}

export async function AnalyticsTag() {
  // Skip in sandbox to keep staging tracking out of the live property.
  if (CONFIG.IS_SANDBOX) return null

  const gaId = await fetchMeasurementId()
  if (!gaId) return null

  return <GoogleAnalytics gaId={gaId} />
}
