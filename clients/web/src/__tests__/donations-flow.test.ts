import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Donations as a dedicated page — Paystack-native inline charge.
 *
 * The previous flow opened an inline DonationModal everywhere a tip CTA
 * existed. Per user feedback, donations are now a full surface
 * (`/donation/[slug]`) so they're shareable, locale-aware, and not stuck
 * inside an overlay. This gate locks the new behaviour:
 *
 *   1. Tip CTAs navigate to /donation/[slug] (locale-prefixed) — they do NOT
 *      open a modal.
 *   2. The donation page reuses the inline channel selector
 *      (DonationPaymentInterface) and never redirects to a Paystack
 *      authorization_url.
 *   3. The CreatorCard / MarketplaceCreatorCard tip affordances still surface
 *      when tipping_enabled is true; clicking them invokes the page nav
 *      handler from the parent (no inline navigation; no modal).
 *   4. The donation success state lives on the page itself (auto-redirect to
 *      the creator), not on a separate hosted Paystack page.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Donations — dedicated /donation/[slug] page', () => {
  test('Donation page exists and renders DonationPageClient', () => {
    const page = read('src/app/(main)/donation/[slug]/page.tsx')
    expect(page).toContain("DonationPageClient")
    expect(page).toContain("'/v1/organizations/creators/{slug}'")
  })

  test('DonationPageClient drives the inline channel selector, not a redirect', () => {
    const client = read(
      'src/app/(main)/donation/[slug]/DonationPageClient.tsx',
    )
    expect(client).toContain('<DonationPaymentInterface')
    expect(client).not.toMatch(/window\.location\.href\s*=\s*`?https?:/)
    expect(client).not.toMatch(/authorization_url/)
    expect(client).not.toMatch(/payment_url/)
  })

  test('CreatorStorefront Tip CTA navigates to /donation/[slug]', () => {
    const page = read(
      'src/components/CreatorStorefront/CreatorStorefrontPage.tsx',
    )
    expect(page).toMatch(/router\.push\([^)]*donation\/\$\{creator\.slug\}/)
    // Old modal pattern is gone.
    expect(page).not.toMatch(/setTipModalOpen/)
    expect(page).not.toContain('<DonationModal')
  })

  test('Product detail Tip CTA navigates to /donation/[slug]', () => {
    const col = read('src/components/ProductDetail/ProductInfoColumn.tsx')
    expect(col).toMatch(/accepts_donations/)
    expect(col).toContain('Tip the creator')

    const client = read('src/components/ProductDetail/ProductDetailClient.tsx')
    expect(client).toMatch(/router\.push\([^)]*donation\/\$\{org\.slug\}/)
    expect(client).not.toContain('<DonationModal')
  })

  test('Featured creators tip nav uses the donation page', () => {
    const featured = read('src/components/Marketplace/FeaturedCreators.tsx')
    expect(featured).toMatch(/router\.push\(/)
    expect(featured).toContain('/donation/')
    expect(featured).not.toContain('<DonationModal')
  })

  test('CreatorsDirectory tip handler navigates to the donation page', () => {
    const dir = read('src/components/Creators/CreatorsDirectory.tsx')
    expect(dir).toMatch(/router\.push\([^)]*donation\//)
    expect(dir).not.toContain('<DonationModal')
  })

  test('DonationPaymentInterface drives the inline /charge + poll flow', () => {
    const iface = read('src/components/Donation/DonationPaymentInterface.tsx')
    expect(iface).toContain('useDonationCharge')
    expect(iface).toContain('useDonationPaymentStatus')
    expect(iface).toMatch(/from '@\/components\/Brand\/payment-icons'/)
    expect(iface).not.toMatch(/from 'lucide-react'/)
    expect(iface).not.toMatch(/authorization_url/)
  })

  test('Donation hooks poll the donation payment-status endpoint', () => {
    const hooks = read('src/hooks/queries/donations.ts')
    expect(hooks).toContain('/v1/donation/{slug}/')
    expect(hooks).toContain('/v1/donation/payment-status/{reference}')
    expect(hooks).toContain('useDonationPaymentChannels')
  })

  test('CreatorCard surfaces a Tip affordance when tipEnabled is true', () => {
    const card = read('src/components/Creators/CreatorCard.tsx')
    expect(card).toMatch(/tipEnabled/)
    expect(card).toContain('data-testid="creator-card-tip"')
    expect(card).toMatch(/e\.preventDefault\(\)/)
    expect(card).toMatch(/e\.stopPropagation\(\)/)
  })

  test('Donation success state lives on the page (auto-redirect)', () => {
    const client = read(
      'src/app/(main)/donation/[slug]/DonationPageClient.tsx',
    )
    expect(client).toContain('data-testid="donation-success"')
    expect(client).toMatch(/setSucceeded\(true\)/)
    expect(client).toMatch(/router\.push\(`\/creators\//)
    expect(client).toMatch(/Thank you for supporting/)
  })
})
