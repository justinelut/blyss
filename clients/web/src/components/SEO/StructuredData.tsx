/**
 * StructuredData — JSON-LD Organization + WebSite schemas.
 *
 * Renders schema.org JSON-LD that Google, Perplexity, Claude Search,
 * ChatGPT Search, and Google SGE all read to populate rich results
 * and AI answer cards. Two schemas, both site-wide:
 *
 * 1. Organization — who Blyss is, where we operate, payment methods,
 *    contact. Sourced by AI when someone asks "what is Blyss" or
 *    "where do Kenyan creators sell digital products".
 *
 * 2. WebSite — declares the site search action so Google can render
 *    a sitelinks search box for "blyss.co.ke" queries.
 *
 * Why server-side <script type="application/ld+json"> instead of
 * Next.js `metadata.other`: the latter only supports a small set of
 * tags. JSON-LD must be raw script, and React allows dangerouslySetInnerHTML
 * for trusted, controlled JSON like this.
 *
 * Anti-slop: every claim is concrete. No "vibrant ecosystem" /
 * "thriving community". The description names the product types,
 * the city, and the payment rail.
 */

const ORIGIN = 'https://blyss.co.ke'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'Blyss',
  url: ORIGIN,
  logo: `${ORIGIN}/og-image.png`,
  description:
    'Marketplace for Kenyan creators selling templates, ebooks, beats, presets, and courses. Buyers pay with M-Pesa or card. Creators are paid within 24 hours.',
  foundingLocation: {
    '@type': 'Place',
    name: 'Nairobi, Kenya',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
  },
  areaServed: { '@type': 'Country', name: 'Kenya' },
  paymentAccepted: ['M-Pesa', 'Visa', 'Mastercard'],
  currenciesAccepted: 'KES',
  sameAs: [
    'https://twitter.com/blyssmarket',
    'https://instagram.com/blyssmarket',
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${ORIGIN}/#website`,
  url: ORIGIN,
  name: 'Blyss',
  publisher: { '@id': `${ORIGIN}/#organization` },
  inLanguage: 'en-KE',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${ORIGIN}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        // Schema.org JSON-LD is plain data — no user input flows in,
        // so dangerouslySetInnerHTML is the standard pattern here.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
    </>
  )
}
