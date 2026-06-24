/**
 * StorefrontLayoutThumb — tiny SVG previews used by the layout picker
 * in the dashboard storefront editor.
 *
 * Each thumb is a stylised top-down shape of the corresponding
 * /creators/{slug} layout: hero band proportions + product grid
 * shape. Pure SVG (no external assets) so they render instantly +
 * pick up the live theme tokens.
 *
 * Sizes and proportions match the actual layouts:
 *   - editorial — tall hero, generous spacing, 3-col grid below
 *   - gallery   — short hero, dominant 2-col image grid
 *   - catalog   — thin identity strip, list rows
 *   - portfolio — panorama hero, 3-col case-study grid
 *   - studio    — text-only hero, numbered list
 */

import * as React from 'react'

import type { StorefrontLayoutSlug } from '@/types/storefront-theme'

interface ThumbProps {
  slug: StorefrontLayoutSlug
  className?: string
}

export const StorefrontLayoutThumb: React.FC<ThumbProps> = ({
  slug,
  className,
}) => {
  return (
    <svg
      viewBox="0 0 120 80"
      role="img"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Card surface */}
      <rect width="120" height="80" fill="var(--surface-elevated)" />
      <rect
        x="0.5"
        y="0.5"
        width="119"
        height="79"
        fill="none"
        stroke="var(--border)"
        strokeWidth="0.5"
      />
      {THUMB_RENDERERS[slug] ?? THUMB_RENDERERS.editorial}
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────────
// Per-layout shapes. Use --text-primary for "ink" blocks, --accent
// for the accent strip, --surface-sunken for fill blocks.
// ───────────────────────────────────────────────────────────────────

const editorialLayout = (
  <>
    {/* Tall banner */}
    <rect x="6" y="6" width="108" height="22" fill="var(--surface-sunken)" />
    {/* Avatar + identity */}
    <circle cx="14" cy="34" r="3" fill="var(--text-primary)" />
    <rect x="20" y="32" width="40" height="2" fill="var(--text-primary)" />
    <rect x="20" y="36" width="24" height="1.5" fill="var(--text-muted)" />
    {/* Generous gap */}
    {/* 3-col grid */}
    <rect x="6" y="48" width="32" height="26" fill="var(--surface-sunken)" />
    <rect x="44" y="48" width="32" height="26" fill="var(--surface-sunken)" />
    <rect x="82" y="48" width="32" height="26" fill="var(--surface-sunken)" />
  </>
)

const galleryLayout = (
  <>
    {/* Shorter banner */}
    <rect x="6" y="6" width="108" height="14" fill="var(--surface-sunken)" />
    {/* Tight identity */}
    <circle cx="12" cy="26" r="2.5" fill="var(--text-primary)" />
    <rect x="18" y="25" width="32" height="1.5" fill="var(--text-primary)" />
    {/* Dominant 2-col image grid */}
    <rect x="6" y="34" width="52" height="40" fill="var(--surface-sunken)" />
    <rect x="62" y="34" width="52" height="40" fill="var(--surface-sunken)" />
  </>
)

const catalogLayout = (
  <>
    {/* Very thin identity strip */}
    <rect x="6" y="6" width="108" height="8" fill="var(--surface-sunken)" />
    <circle cx="12" cy="10" r="2" fill="var(--text-primary)" />
    <rect x="18" y="9" width="20" height="1" fill="var(--text-primary)" />
    {/* List rows */}
    {[20, 30, 40, 50, 60, 70].map((y) => (
      <g key={y}>
        <rect x="6" y={y} width="6" height="6" fill="var(--surface-sunken)" />
        <rect x="16" y={y + 1.5} width="60" height="1.5" fill="var(--text-primary)" />
        <rect x="16" y={y + 4.5} width="40" height="1" fill="var(--text-muted)" />
        <rect x="100" y={y + 1.5} width="14" height="1.5" fill="var(--accent)" />
      </g>
    ))}
  </>
)

const portfolioLayout = (
  <>
    {/* Panorama */}
    <rect x="6" y="6" width="108" height="12" fill="var(--surface-sunken)" />
    {/* Resume header — 'Selected work' eyebrow */}
    <rect x="6" y="22" width="20" height="1.2" fill="var(--accent)" />
    <rect x="6" y="26" width="60" height="3" fill="var(--text-primary)" />
    <rect x="6" y="32" width="80" height="1.5" fill="var(--text-muted)" />
    {/* 3-col case-study grid */}
    <rect x="6" y="40" width="32" height="34" fill="var(--surface-sunken)" />
    <rect x="44" y="40" width="32" height="34" fill="var(--surface-sunken)" />
    <rect x="82" y="40" width="32" height="34" fill="var(--surface-sunken)" />
  </>
)

const studioLayout = (
  <>
    {/* No banner — pure type */}
    <rect x="6" y="8" width="22" height="1.4" fill="var(--accent)" />
    <rect x="6" y="14" width="80" height="3.5" fill="var(--text-primary)" />
    <rect x="6" y="22" width="60" height="1.5" fill="var(--text-muted)" />
    <rect x="6" y="26" width="50" height="1.5" fill="var(--text-muted)" />
    {/* Numbered list rows (numerals on the left) */}
    {[34, 42, 50, 58, 66].map((y, i) => (
      <g key={y}>
        <rect x="6" y={y} width="3" height="2" fill="var(--accent)" />
        <rect x="14" y={y} width="40" height="2" fill="var(--text-primary)" />
        <rect x="14" y={y + 3} width="26" height="1" fill="var(--text-muted)" />
        <rect x="100" y={y} width="14" height="2" fill="var(--text-secondary)" />
        {/* Hairline divider */}
        {i < 4 && (
          <line
            x1="6"
            x2="114"
            y1={y + 6}
            y2={y + 6}
            stroke="var(--border)"
            strokeWidth="0.3"
          />
        )}
      </g>
    ))}
  </>
)

const THUMB_RENDERERS: Record<StorefrontLayoutSlug, React.ReactNode> = {
  editorial: editorialLayout,
  gallery: galleryLayout,
  catalog: catalogLayout,
  portfolio: portfolioLayout,
  studio: studioLayout,
}
