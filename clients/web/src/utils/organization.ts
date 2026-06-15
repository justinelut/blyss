import { Client, schemas, unwrap } from '@/lib/api'
import { notFound } from 'next/navigation'
import { cache } from 'react'

const _getOrganizationBySlug = async (
  api: Client,
  slug: string,
  bypassCache: boolean = false,
): Promise<schemas['Organization'] | undefined> => {
  const requestOptions: any = {
    params: {
      query: {
        slug,
      },
    },
  }

  if (bypassCache) {
    // 'no-store' fully bypasses Next.js's data cache; 'no-cache' would
    // still let the response be cached after a freshness check, which
    // for the storefront-theme editor's post-save reload means a stale
    // org row could still come back. The dashboard editor calls this
    // path with bypassCache=true after a PATCH and needs the fresh
    // theme tokens immediately.
    requestOptions.cache = 'no-store'
  } else {
    requestOptions.next = {
      tags: [`organizations:${slug}`],
      revalidate: 600,
    }
  }

  const data = await unwrap(api.GET('/v1/organizations/', requestOptions))
  return data.items[0]
}

// Tell React to memoize it for the duration of the request
const _getOrganizationBySlugCached = (api: Client, slug: string) =>
  _getOrganizationBySlug(api, slug, false)

export const getOrganizationBySlug = cache(_getOrganizationBySlugCached)

export const getOrganizationBySlugOrNotFound = async (
  api: Client,
  slug: string,
  bypassCache: boolean = false,
): Promise<schemas['Organization']> => {
  // Caller can opt out of the 10 min ISR cache when the page reads
  // mutable per-user state (e.g. /dashboard/{slug}/finance/account
  // reads subaccount_status which the user just activated). Default
  // false preserves the cache on most dashboard pages.
  let organization = bypassCache
    ? await _getOrganizationBySlug(api, slug, true)
    : await getOrganizationBySlug(api, slug)

  // If the organization is not found, refetch bypassing the cache
  // This avoids race conditions with new organizations (e.g. during onboarding)
  // without losing the cache in 99% of the cases
  if (!organization) {
    organization = await _getOrganizationBySlug(api, slug, true)
  }

  if (!organization) {
    notFound()
  }
  return organization
}
