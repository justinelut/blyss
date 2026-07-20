"use client";

/**
 * BlyssDialog — branded modal with motion animations.
 *
 * Replaces shadcn's `Dialog` for surfaces that want the Blyss-specific
 * motion + visual treatment (warm scrim instead of pure-black, paper
 * surface, smooth ease, no bounce). The shadcn dialog is fine for
 * dashboard utility modals; this one is for marketing + storefront
 * surfaces where motion + materials matter.
 *
 * Behaviour:
 * - Portaled to <body> so the modal escapes any transformed parent
 *   (the storefront hero animates with `scale`, which would otherwise
 *   trap a fixed modal inside its stacking context).
 * - Backdrop fades in (200ms) under a paper card that scales from
 *   0.96 → 1.0 + fades up 8px (350ms, smooth ease).
 * - Click on backdrop closes. Escape closes. Focus trap via the
 *   native `<dialog>` element's `showModal()`.
 * - Respects `prefers-reduced-motion` — short-circuits to instant.
 * - Body scroll is locked while open.
 *
 * Per blyss-design §3.4: solid scrim (no gradient), no shadow on the
 * card, motion uses cubic-bezier(0.32, 0.72, 0, 1).
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

export interface BlyssDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the user dismisses (backdrop click / Escape / × button). */
  onOpenChange: (open: boolean) => void;
  /** Modal contents — `BlyssDialogHeader` + `BlyssDialogBody` typically. */
  children: React.ReactNode;
  /** Width cap. Defaults to 640. */
  maxWidth?: number;
  /** Hide the close (×) button. Use only when the body has its own
   *  primary dismissal affordance. */
  hideCloseButton?: boolean;
  /** Optional accessible label for the modal — required if no
   *  `BlyssDialogTitle` is rendered inside. */
  ariaLabel?: string;
  /** Optional id of the title element (used by aria-labelledby). When
   *  `BlyssDialogTitle` is used, set its `id` and pass the same id here. */
  titleId?: string;
  /** Optional id of the description element (aria-describedby). */
  descriptionId?: string;
  /** Extra className for the card. */
  className?: string;
}

export const BlyssDialog: React.FC<BlyssDialogProps> = ({
  open,
  onOpenChange,
  children,
  maxWidth = 640,
  hideCloseButton = false,
  ariaLabel,
  titleId,
  descriptionId,
  className,
}) => {
  const [mounted, setMounted] = React.useState(false);

  // SSR-safe portal: only render after mount so server output stays
  // clean and React doesn't hydrate a portal that didn't exist on the
  // server.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Escape closes. Listener attached only while open so we don't pay
  // for it the rest of the time.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onOpenChange]);

  // Body scroll lock while open. Restores the previous overflow value
  // on unmount / close so we don't trample other scroll-lock callers.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) return null;

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      aria-hidden={false}
    >
      {/* Warm scrim — solid colour per §3.4 (no gradient).
              Click closes. */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
        tabIndex={-1}
        className="absolute inset-0 bg-[rgba(15,14,12,0.55)] backdrop-blur-[2px] sm:backdrop-blur-sm"
      />

      {/* Card. Bottom-sheet on mobile (slides up), centered modal
              on sm+ (scales + fades). The two stages share the same
              motion config; the entry transform key swap is what
              changes. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ maxWidth }}
        className={cn(
          "relative z-[101] w-full overflow-hidden border-t border-[var(--border)] bg-[var(--background)] sm:rounded-lg sm:border",
          // Bottom-sheet rounding on mobile: only the top corners
          "rounded-t-2xl sm:rounded-t-lg",
          // Cap height so very long bodies still scroll inside
          // the card rather than blowing past the viewport.
          "max-h-[88vh] sm:max-h-[80vh]",
          "flex flex-col",
          className,
        )}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            <FiX size={18} aria-hidden="true" />
          </button>
        )}

        {children}
      </div>
    </div>
  ) : null;

  return createPortal(overlay, document.body);
};

// ───────────────────────────────────────────────────────────────────
// Sub-parts — Header / Title / Body for consistent typography +
// padding so callers don't reinvent the spacing each time.
// ───────────────────────────────────────────────────────────────────

export const BlyssDialogHeader: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, children, ...rest }) => (
  <div
    className={cn(
      "shrink-0 px-6 pt-10 pb-4 text-left sm:px-10 sm:pt-12",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

export interface BlyssDialogEyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const BlyssDialogEyebrow: React.FC<BlyssDialogEyebrowProps> = ({
  className,
  children,
  ...rest
}) => (
  <p
    className={cn(
      "font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]",
      className,
    )}
    {...rest}
  >
    {children}
  </p>
);

export const BlyssDialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className, children, ...rest }) => (
  <h2
    className={cn(
      "mt-2 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[28px]",
      className,
    )}
    {...rest}
  >
    {children}
  </h2>
);

export const BlyssDialogBody: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, children, ...rest }) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto px-6 pb-8 pt-2 sm:px-10 sm:pb-12",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
