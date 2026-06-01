import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ product_id?: string }>
}

/**
 * /checkout — entry broker.
 *
 * NOTE: anonymous checkout creation is not yet supported by the API
 * (`POST /v1/checkouts/` and `POST /v1/checkout-links/` both require creator
 * auth, scope `checkouts:write`). Until a public buy path exists — either a
 * per-product checkout link surfaced on the public product payload, or a
 * public checkout-create endpoint — we cannot mint a hosted checkout for an
 * anonymous buyer here. We send the user back to the product page rather than
 * 404 or 500. See FINDINGS in the session summary: this is the remaining
 * blocker for completing a purchase.
 */
export default async function CheckoutEntry({ searchParams }: Props) {
  const { product_id } = await searchParams
  redirect(product_id ? `/product/${product_id}` : '/marketplace')
}
