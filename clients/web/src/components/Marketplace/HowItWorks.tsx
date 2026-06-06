import { Eyebrow, SectionDivider, typography } from '@/design'
import { cn } from '@/lib/utils'

const steps = [
  { n: '01', text: 'Browse digital products from independent creators worldwide.' },
  { n: '02', text: 'Pay with card or mobile money. Instant delivery to your inbox.' },
  { n: '03', text: 'Support real makers — every purchase pays the creator directly.' },
]

/**
 * HowItWorks — three numbered, buyer-facing steps on the home page.
 *
 * Per plan §6.1 step 8 + Etsy-flavored revamp. The seller-facing four-step
 * version (storefront setup, file upload, payouts) lives on /start —
 * showing it to buyers conflated audiences and gated the marketplace
 * behind seller-onboarding language.
 *
 * Visual: numerals 01/02/03 in --accent display weight, one short
 * sentence per step. On desktop horizontal row, mobile stack.
 */
export const HowItWorks = () => {
  return (
    <SectionDivider tone="sunken" density="lg">
      <div className="mb-12">
        <Eyebrow>How Blyss works</Eyebrow>
        <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
          Buy directly from independent creators.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step) => (
          <div key={step.n} className="flex flex-col items-start">
            <span
              className="font-display text-[clamp(56px,6vw,80px)] font-light leading-none tabular-nums text-[var(--accent)]"
              aria-hidden="true"
            >
              {step.n}
            </span>
            <p className="mt-4 max-w-[28ch] font-display text-[18px] leading-[1.4] text-[var(--text-primary)] md:text-[20px]">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </SectionDivider>
  )
}
