import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ client_secret?: string; product_id?: string }>
}

/**
 * /checkout — entry broker.
 *
 * The cart Checkout button POSTs to /v1/cart/checkout and gets back a
 * client_secret, then navigates to /checkout/{client_secret}.  This page
 * handles any legacy /checkout?client_secret=... query-param redirects and
 * falls back to /marketplace for bare direct navigation.
 */
export default async function CheckoutEntry({ searchParams }: Props) {
  const { client_secret, product_id } = await searchParams

  if (client_secret) {
    redirect(`/checkout/${client_secret}`)
  }

  if (product_id) {
    redirect(`/product/${product_id}`)
  }

  redirect('/marketplace')
}
