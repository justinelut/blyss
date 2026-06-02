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
  // Bounce them to the backend's resolve endpoint, which creates the
  // checkout session, then redirects back here with the real client_secret.
  // Without this, hitting `buy.blyss.co.ke/checkout/polar_cl_xxx` 404s
  // because /v1/checkouts/client/polar_cl_xxx doesn't match a checkout row.
  if (clientSecret.startsWith('polar_cl_')) {
    const resolveURL = new URL(
      `/v1/checkout-links/${clientSecret}/redirect`,
      getPublicServerURL(),
    )
    // Forward through embed/theme/locale so the resolved checkout keeps the
    // same UI mode the link was opened in.
    if (_embed) resolveURL.searchParams.set('embed', _embed)
    if (theme) resolveURL.searchParams.set('theme', theme)
    if (_locale) resolveURL.searchParams.set('locale', _locale)
    redirect(resolveURL.toString())
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
