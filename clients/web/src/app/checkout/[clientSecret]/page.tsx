import { getPublicServerURL, getServerURL } from '@/utils/api'
import { resolveLocale } from '@/utils/i18n'
import {
  CheckoutFormProvider,
  CheckoutProvider,
} from '@/components/Checkout/providers'
import {
  ClientResponseError,
  NotFoundResponseError,
  createClient,
  unwrap,
} from '@/lib/api'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import CheckoutPage from './CheckoutPage'

export async function generateMetadata(props: {
  params: Promise<{ clientSecret: string }>
}): Promise<Metadata> {
  const params = await props.params
  const { clientSecret } = params

  const client = createClient(getServerURL())
  const { data: checkout } = await client.GET(
    '/v1/checkouts/client/{client_secret}',
    { params: { path: { client_secret: clientSecret } } },
  )

  if (!checkout?.product) {
    return { title: 'Checkout | Blyss' }
  }

  return {
    title: `${checkout.organization.name} | ${checkout.product.name}`,
  }
}

export default async function Page(props: {
  params: Promise<{ clientSecret: string }>
  searchParams: Promise<{
    embed?: string
    theme?: 'light' | 'dark'
    locale?: string
  }>
}) {
  const searchParams = await props.searchParams

  const { embed: _embed, theme, locale: _locale } = searchParams

  const params = await props.params

  const { clientSecret } = params

  // CheckoutLink IDs (polar_cl_*) are NOT checkout-session client_secrets.
  // Resolve them server-side via the backend's /v1/checkout-links/{cs}/redirect
  // endpoint, which creates a checkout session and 302s back to the frontend.
  // We follow the redirect SERVER-SIDE so the browser only ever sees the
  // final /checkout/{real_session_secret} URL on the current public host
  // (e.g. buy.blyss.co.ke) — never api.blyss.co.ke.
  if (clientSecret.startsWith('polar_cl_')) {
    const resolveURL = new URL(
      `/v1/checkout-links/${clientSecret}/redirect`,
      getServerURL(),
    )
    if (_embed) resolveURL.searchParams.set('embed', _embed)
    if (theme) resolveURL.searchParams.set('theme', theme)
    if (_locale) resolveURL.searchParams.set('locale', _locale)

    const resp = await fetch(resolveURL.toString(), {
      redirect: 'manual',
      cache: 'no-store',
    })
    const location = resp.headers.get('location')
    if (location) {
      // Backend redirects to FRONTEND_BASE_URL/checkout/{real_secret}.
      // We send the browser only the path+query — it stays on the current
      // public host (buy.blyss.co.ke) and never sees api.blyss.
      try {
        const target = new URL(location)
        redirect(target.pathname + target.search)
      } catch {
        // Already a relative URL — pass through unchanged.
        redirect(location)
      }
    }
    notFound()
  }

  const embed = _embed === 'true'
  const client = createClient(getServerURL())

  let checkout
  try {
    checkout = await unwrap(
      client.GET('/v1/checkouts/client/{client_secret}', {
        params: { path: { client_secret: clientSecret } },
      }),
    )
  } catch (error) {
    if (error instanceof NotFoundResponseError) {
      notFound()
    } else if (
      error instanceof ClientResponseError &&
      error.response.status === 410
    ) {
      notFound() // TODO: show expired checkout page
    } else {
      throw error
    }
  }

  if (checkout.status === 'succeeded') {
    redirect(checkout.success_url)
  }

  if (checkout.status !== 'open') {
    redirect(`/checkout/${checkout.client_secret}/confirmation`)
  }

  const locale = await resolveLocale(_locale, checkout.locale)

  return (
    <CheckoutProvider
      clientSecret={checkout.client_secret}
      serverURL={getPublicServerURL()}
    >
      <CheckoutFormProvider locale={locale}>
        <CheckoutPage theme={theme} embed={embed} locale={locale} />
      </CheckoutFormProvider>
    </CheckoutProvider>
  )
}
