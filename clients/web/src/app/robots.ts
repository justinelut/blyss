import { CONFIG } from '@/utils/config'
import { MetadataRoute } from 'next'

/**
 * Robots.
 *
 * Sandbox deploys are fully blocked (no public traffic).
 * Production allows everything except:
 *   - Auth + session surfaces (/login, /verify-email)
 *   - Authenticated dashboard (/dashboard/*)
 *   - Per-user state pages (/cart, /wishlist, /portal/*)
 *   - Internal API + Next.js paths (/api/*, /_next/*)
 *   - Search results (Q-strings, low-value pages)
 *   - The country-prefix redirect endpoints — search engines hit /ke
 *     directly and Google understands the canonical link header.
 *
 * Crawl-delay is intentionally not set; Googlebot ignores it and
 * Bing+Yandex behave fine with our edge cache.
 */

export default function robots(): MetadataRoute.Robots {
  if (CONFIG.IS_SANDBOX) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/login/',
          '/login',
          '/verify-email/',
          '/verify-email',
          '/cart',
          '/cart/',
          '/wishlist',
          '/wishlist/',
          '/api/',
          '/_next/',
          '/portal/',
          '/search', // Q-string results, low-value, dupes
          '/*?currency=',
          '/*?page=',
        ],
      },
      // Politely throttle AI scrapers we don't want training on our pages
      // (without blocking AI search agents that send user-driven traffic
      // like PerplexityBot / ChatGPT-User / ClaudeBot).
      {
        userAgent: 'GPTBot',
        disallow: '/dashboard/',
      },
      {
        userAgent: 'CCBot', // Common Crawl
        disallow: '/dashboard/',
      },
    ],
    sitemap: 'https://blyss.co.ke/sitemap.xml',
    host: 'https://blyss.co.ke',
  }
}
