import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * ClosingCtaBand — dark mode CTA at the bottom of the home page.
 *
 * Per plan §6.1 step 9. Full-bleed dark, single italic Inter Display line,
 * primary CTA button, small secondary "Already selling?" sign-in link.
 *
 * This component locally inverts the palette via inline color values rather
 * than `[data-theme="dark"]` so it always renders dark regardless of the
 * site-wide theme.
 */
export const ClosingCtaBand = () => {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-[#0F0E0C] text-[#F5F2EC]',
      )}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-24 text-center md:px-16 md:py-32">
        <h2
          className={cn(
            'mx-auto max-w-[20ch] font-display font-medium tracking-[-0.02em] leading-[1.05]',
            'text-[clamp(36px,5vw,64px)]',
          )}
        >
          <em className="font-display italic">
            Your storefront is one signup away.
          </em>
        </h2>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
          <Link
            href="/start"
            className="inline-flex h-12 items-center justify-center rounded-md bg-[#F97316] px-7 font-sans text-[15px] font-medium text-[#0F0E0C] transition-colors hover:bg-[#FFA052]"
          >
            Start selling
          </Link>
          <Link
            href="/login"
            className="font-sans text-[14px] text-[#BAB5A8] underline-offset-4 transition-colors hover:text-[#F5F2EC] hover:underline"
          >
            Already selling? Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}
