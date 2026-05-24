import { Eyebrow, SectionDivider, typography } from '@/design'
import { cn } from '@/lib/utils'

const steps = [
  { n: '1', text: 'Set up your storefront in 10 minutes.' },
  { n: '2', text: 'Upload your work — files, links, or markdown.' },
  { n: '3', text: 'Buyers pay with M-Pesa or card.' },
  { n: '4', text: 'We pay you out within 24 hours.' },
]

/**
 * HowItWorks — 4 numbered steps.
 *
 * Per plan §6.1 step 8. Numbers in Inter Display 300 96px accent color, each
 * step gets one sentence (not a bulleted list). On desktop: horizontal row.
 * On mobile: vertical stack.
 */
export const HowItWorks = () => {
  return (
    <SectionDivider tone="sunken" density="lg">
      <div className="mb-12">
        <Eyebrow>How it works</Eyebrow>
        <h2 className={cn(typography.h2, 'mt-3 text-[var(--text-primary)]')}>
          Four steps to your first sale.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {steps.map((step) => (
          <div key={step.n} className="flex flex-col items-start">
            <span
              className="font-display text-[clamp(64px,7vw,96px)] font-light leading-none text-[var(--accent)]"
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
