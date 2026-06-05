import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Inline Paystack-native tipping gate.
 *
 * Locks the donation surface behaviours so they can't silently regress to the
 * old hosted-redirect flow:
 *
 *   1. The creator storefront's Tip CTA opens the inline DonationModal — it
 *      does NOT navigate away to a /donation route (which 404'd).
 *   2. The DonationModal renders the inline channel selector
 *      (DonationPaymentInterface) and never redirects to a Paystack
 *      authorization_url.
 *   3. The CreatorCard surfaces a Tip affordance when tipEnabled is true.
 *   4. The donation success state lives INSIDE the modal (auto-close), not on
 *      a separate hosted page.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('Donations — inline Paystack-native tipping', () => {
  test('StorefrontHero Tip CTA opens the modal (no /donation navigation)', () => {
    const page = read(
      'src/components/CreatorStorefront/CreatorStorefrontPage.tsx',
    )
    // handleTipClick opens the modal via state…
    expect(page).toMatch(/setTipModalOpen\(true\)/)
    // …and does NOT navigate to the old 404'ing /donation route.
    expect(page).not.toMatch(/window\.location\.href\s*=\s*`?\/donation/)
    // The shared DonationModal is mounted on the page.
    expect(page).toContain('<DonationModal')
    expect(page).toContain('creatorSlug={creator.slug}')
  })

  test('DonationModal reuses the inline channel selector, not a redirect', () => {
    const modal = read('src/components/Donation/DonationModal.tsx')
    // Inline channel selector is mounted…
    expect(modal).toContain('<DonationPaymentInterface')
    // …and the modal never redirects to a Paystack hosted page.
    expect(modal).not.toMatch(/window\.location\.href/)
    expect(modal).not.toMatch(/authorization_url/)
    expect(modal).not.toMatch(/payment_url/)
  })

  test('DonationPaymentInterface drives the inline /charge + poll flow', () => {
    const iface = read('src/components/Donation/DonationPaymentInterface.tsx')
    // Uses the donation charge + status-poll hooks (inline, no redirect).
    expect(iface).toContain('useDonationCharge')
    expect(iface).toContain('useDonationPaymentStatus')
    // Reuses the brand payment-icons set, not Lucide.
    expect(iface).toMatch(/from '@\/components\/Brand\/payment-icons'/)
    expect(iface).not.toMatch(/from 'lucide-react'/)
    // No hosted-page redirect.
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
    // Clicking it must not navigate the wrapping <Link> — it opens the modal.
    expect(card).toMatch(/e\.preventDefault\(\)/)
    expect(card).toMatch(/e\.stopPropagation\(\)/)
  })

  test('CreatorsDirectory mounts a single shared DonationModal', () => {
    const dir = read('src/components/Creators/CreatorsDirectory.tsx')
    expect(dir).toContain('<DonationModal')
    expect(dir).toMatch(/setTipTarget/)
  })

  test('Product detail exposes "Tip the creator" when accepts_donations', () => {
    const col = read('src/components/ProductDetail/ProductInfoColumn.tsx')
    expect(col).toMatch(/accepts_donations/)
    expect(col).toContain('Tip the creator')
    expect(col).toContain('data-testid="product-tip-creator"')

    const client = read('src/components/ProductDetail/ProductDetailClient.tsx')
    expect(client).toContain('<DonationModal')
  })

  test('Donation success state stays inside the modal (auto-close)', () => {
    const modal = read('src/components/Donation/DonationModal.tsx')
    // Success flips an in-modal state and auto-closes after 3s.
    expect(modal).toContain('data-testid="donation-success"')
    expect(modal).toMatch(/setSucceeded\(true\)/)
    expect(modal).toMatch(/setTimeout\([\s\S]*?3000\)/)
    // Thank-you copy renders inside the dialog.
    expect(modal).toMatch(/Thank you for supporting/)
  })
})
