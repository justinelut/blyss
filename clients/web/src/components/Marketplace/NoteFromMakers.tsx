import { SectionDivider } from '@/design'
import { cn } from '@/lib/utils'

interface NoteFromMakersProps {
  /** Override the editorial paragraph */
  body?: string
  /** Override the signature */
  signature?: string
}

const DEFAULT_BODY =
  "Blyss is built for Kenyan creators tired of foreign platforms taking 10% and refusing M-Pesa. We charge 20%, pay out in 24 hours, and don't pretend you're not here."

const DEFAULT_SIGNATURE = '— Blyss · Nairobi'

/**
 * NoteFromMakers — full-bleed editorial paragraph in Inter italic.
 *
 * Per plan §6.1 step 7. Centered, max 60ch, signed off "— Blyss · Nairobi".
 * Pulled from a Settings global so the studio can edit copy without code.
 */
export const NoteFromMakers = ({
  body = DEFAULT_BODY,
  signature = DEFAULT_SIGNATURE,
}: NoteFromMakersProps) => {
  return (
    <SectionDivider tone="default" density="xl">
      <div className="mx-auto max-w-[60ch] text-center">
        <p
          className={cn(
            'font-sans italic text-[clamp(20px,2.4vw,28px)] leading-[1.4] text-[var(--text-primary)]',
          )}
        >
          {body}
        </p>
        <p className="mt-8 font-sans text-[12px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {signature}
        </p>
      </div>
    </SectionDivider>
  )
}
