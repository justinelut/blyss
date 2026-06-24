'use client'

/**
 * shadcn Dialog — Blyss restyle.
 *
 * The original shadcn defaults shipped with several anti-design patterns
 * that didn't fit the Blyss surface:
 *   - Pure black `bg-black/80` overlay (we use the warm scrim
 *     `rgba(15,14,12,0.55)` per §3.2 so the modal feels like part of
 *     the paper UI, not a generic dropshipping admin)
 *   - Heavy `zoom-in-95` + `slide-in-from-top-[48%]` entry animation
 *     (we use a simple smooth fade + 4px lift — feels like the Linear
 *     dialog rather than a Bootstrap modal)
 *   - `shadow-lg` on the content (forbidden by §3.4 — borders / tone
 *     shifts only)
 *   - Visible `focus:ring-2 focus:ring-offset-2 focus:ring-ring` on
 *     the × button — every dashboard modal had a navy outline halo
 *     sitting around the close icon
 *
 * This file keeps the full Radix accessibility behaviour (portal, focus
 * trap, escape-to-close, scroll lock, aria-* wiring) and simply swaps
 * the surface treatment + motion for Blyss tones. All exported names
 * match the original so call-sites don't have to change.
 *
 * For new marketing / storefront surfaces prefer `@/design/BlyssDialog`
 * which uses motion/react directly and supports bottom-sheet on mobile.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Warm scrim instead of pure black. Simple fade only — no
      // heavy slide/zoom on the backdrop.
      'fixed inset-0 z-50 bg-[rgba(15,14,12,0.55)] backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = ({
  ref,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Surface — paper background, hairline border (no shadow per §3.4),
        // rounded 8px to match the rest of the system.
        'fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4',
        'border border-[var(--border)] bg-[var(--background)] p-6 sm:rounded-lg',
        // Motion — simple smooth fade + 4px translate lift on enter.
        // Duration short (180ms) so heavy modals don't feel slow.
        'duration-200',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        // Keep a small lift but kill the 48%-slide-from-top + 95%-zoom.
        // The lift feels like the modal "settles" rather than launches.
        'data-[state=open]:slide-in-from-top-1 data-[state=closed]:slide-out-to-top-1',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          // Subtle, ringless. On hover and on focus we shift the
          // background and color — no halo.
          'absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-md',
          'text-[var(--text-muted)] transition-colors',
          'hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
          'focus:bg-[var(--surface-sunken)] focus:text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:bg-[var(--surface-sunken)]',
          'disabled:pointer-events-none',
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className,
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = ({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      // Use Blyss display type. Existing callers can override via
      // `className`.
      'font-display text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]',
      className,
    )}
    {...props}
  />
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = ({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]',
      className,
    )}
    {...props}
  />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
