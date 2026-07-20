import { FiSliders } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface BrowseMobileFiltersTriggerProps {
  onClick: () => void;
  activeCount: number;
  className?: string;
}

/** Lightweight trigger kept in the initial marketplace bundle. */
export const BrowseMobileFiltersTrigger = ({
  onClick,
  activeCount,
  className,
}: BrowseMobileFiltersTriggerProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex h-11 items-center gap-2 rounded-md bg-[var(--surface-sunken)] px-4 font-sans text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]",
      className,
    )}
  >
    <FiSliders size={16} aria-hidden="true" />
    Filters
    {activeCount > 0 && (
      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--accent-foreground)]">
        {activeCount}
      </span>
    )}
  </button>
);
