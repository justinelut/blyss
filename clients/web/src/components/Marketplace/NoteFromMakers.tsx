import { SectionDivider } from "@/design";
import { cn } from "@/lib/utils";

interface NoteFromMakersProps {
  /** Override the editorial paragraph */
  body?: string;
  /** Override the signature */
  signature?: string;
}

const DEFAULT_BODY =
  "Independent work from Kenya, made for screens everywhere. Buy a practical template, a thoughtful guide, a new sound, or ongoing access to a creator you want to support.";

const DEFAULT_SIGNATURE = "— Blyss";

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
            "font-sans italic text-[clamp(20px,2.4vw,28px)] leading-[1.4] text-[var(--text-primary)]",
          )}
        >
          {body}
        </p>
        <p className="mt-8 font-sans text-[12px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {signature}
        </p>
      </div>
    </SectionDivider>
  );
};
