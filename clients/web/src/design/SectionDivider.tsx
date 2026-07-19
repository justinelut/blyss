import { cn } from "@/lib/utils";

interface SectionDividerProps {
  /** Surface tone; sections are separated by tone rather than shadows. */
  tone?: "default" | "sunken" | "elevated" | "dark";
  /** Vertical padding profile. */
  density?: "sm" | "md" | "lg" | "xl";
  /** Skip the canonical max-width container. */
  fullBleed?: boolean;
  className?: string;
  /** Optional responsive gutter override for a specific surface. */
  containerClassName?: string;
  children: React.ReactNode;
}

const toneStyles: Record<NonNullable<SectionDividerProps["tone"]>, string> = {
  default: "bg-[var(--background)] text-[var(--text-primary)]",
  sunken: "bg-[var(--surface)] text-[var(--text-primary)]",
  elevated: "bg-[var(--surface-elevated)] text-[var(--text-primary)]",
  dark: "dark bg-[var(--background)] text-[var(--text-primary)]",
};

const densityStyles: Record<
  NonNullable<SectionDividerProps["density"]>,
  string
> = {
  sm: "py-10 md:py-14",
  md: "py-12 md:py-18 lg:py-20",
  lg: "py-14 md:py-20 lg:py-24",
  xl: "py-18 md:py-24 lg:py-32",
};

/** Canonical tonal section wrapper. */
export const SectionDivider = ({
  tone = "default",
  density = "lg",
  fullBleed = false,
  className,
  containerClassName,
  children,
}: SectionDividerProps) => {
  return (
    <section
      className={cn(toneStyles[tone], densityStyles[density], className)}
    >
      {fullBleed ? (
        children
      ) : (
        <div
          className={cn(
            "mx-auto max-w-[1280px] px-6 md:px-16",
            containerClassName,
          )}
        >
          {children}
        </div>
      )}
    </section>
  );
};
