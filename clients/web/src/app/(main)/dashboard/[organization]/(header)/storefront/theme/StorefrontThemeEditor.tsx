'use client'

/**
 * StorefrontThemeEditor — the in-dashboard Brand tab editor for the
 * creator's /creators/{slug} storefront theme. Plan §19.8.
 *
 * Three tabs: Brand (active in v1), Layout (disabled), Sections
 * (disabled). The Brand tab carries:
 *   - Accent palette (8 swatches)
 *   - Headline-font picker (4 cards)
 *   - Display-style + motion radio groups
 *   - Live-preview iframe (right column on desktop, bottom drawer on mobile)
 *   - Sticky save / discard toolbar
 *   - Reset-to-defaults button (top right)
 *   - 'View public storefront →' link (top right) — opens new tab
 *
 * Form state lives in plain useState. Each change debounces a POST to
 * /v1/organizations/{id}/storefront/tokens/preview which returns a
 * signed token; the iframe `src` updates with that token so the
 * preview reflects the unsaved tokens. Save calls PATCH; discard
 * calls DELETE on the preview endpoint and resets the form.
 *
 * Anti-slop: no neon swatches, no drop-shadow cards, palette swatches
 * sized to the §3 spacing scale (24px base, 96px swatches), borders
 * not shadows for selection state, Inter Display headlines locally
 * (the Storefront page is a dashboard surface, not the storefront).
 */

import * as React from 'react'

import Avatar from '@/components/atoms/Avatar'
import { toast } from '@/components/Toast/use-toast'
import { Skeleton, Eyebrow, typography } from '@/design'
import { STOREFRONT_PALETTE } from '@/design/storefront-palette'
import {
  STOREFRONT_THEME_PRESETS,
  findMatchingPreset,
} from '@/design/storefront-presets'
import { schemas } from '@/lib/api'
import { api } from '@/utils/client'
import { cn } from '@/lib/utils'
import {
  STOREFRONT_TOKENS_DEFAULTS,
  type AccentName,
  type DisplayStyle,
  type HeadlineFont,
  type Motion,
  type StorefrontTokens,
} from '@/types/storefront-theme'
import {
  cormorantGaramondFont,
  interDisplayFont,
  interTightFont,
} from '@/fonts/fonts'
import { FiArrowUpRight, FiCheck, FiRefreshCw } from 'react-icons/fi'

interface Props {
  organization: schemas['Organization']
}

type TabId = 'brand' | 'layout' | 'sections'

const FONT_LABEL: Record<HeadlineFont, string> = {
  'space-grotesk': 'Space Grotesk',
  'inter-display': 'Inter Display',
  'cormorant-garamond': 'Cormorant Garamond',
  'inter-tight': 'Inter Tight',
}

const FONT_DESCRIPTION: Record<HeadlineFont, string> = {
  'space-grotesk': 'Modern grotesk. Blyss default.',
  'inter-display': 'Editorial precision.',
  'cormorant-garamond': 'Italic-friendly serif. Boutique.',
  'inter-tight': 'Condensed. Dense product walls.',
}

const FONT_CLASS: Record<HeadlineFont, string> = {
  'space-grotesk': '', // global default — no override needed
  'inter-display': interDisplayFont.className,
  'cormorant-garamond': cormorantGaramondFont.className,
  'inter-tight': interTightFont.className,
}

const DISPLAY_STYLE_LABEL: Record<DisplayStyle, string> = {
  editorial: 'Editorial',
  minimal: 'Minimal',
  bold: 'Bold',
}

const DISPLAY_STYLE_DESCRIPTION: Record<DisplayStyle, string> = {
  editorial: 'Balanced typography. Like Aimé Leon Dore.',
  minimal: 'Even leading. Like Linear.',
  bold: 'Tight tracking. High-fashion editorials.',
}

const MOTION_LABEL: Record<Motion, string> = {
  subtle: 'Subtle',
  standard: 'Standard',
  expressive: 'Expressive',
}

const MOTION_DESCRIPTION: Record<Motion, string> = {
  subtle: 'Faster transitions, no scroll reveals.',
  standard: 'Blyss default.',
  expressive: 'Slightly slower, scroll-triggered reveals.',
}

/**
 * Read the saved tokens off the organization row (which the dashboard
 * fetched server-side). Falls back to v1 defaults if the field is
 * missing — covers the moment between deploy and migration.
 */
const readSavedTokens = (
  organization: schemas['Organization'],
): StorefrontTokens => {
  const raw = (organization as unknown as { theme_tokens?: unknown })
    .theme_tokens
  if (raw && typeof raw === 'object') {
    return { ...STOREFRONT_TOKENS_DEFAULTS, ...(raw as StorefrontTokens) }
  }
  return STOREFRONT_TOKENS_DEFAULTS
}

const tokensEqual = (a: StorefrontTokens, b: StorefrontTokens): boolean =>
  a.accent === b.accent &&
  a.accent_secondary === b.accent_secondary &&
  a.headline_font === b.headline_font &&
  a.display_style === b.display_style &&
  a.motion === b.motion

const SITE_BASE =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'https://blyss.co.ke'

export const StorefrontThemeEditor: React.FC<Props> = ({ organization }) => {
  const savedTokens = React.useMemo(
    () => readSavedTokens(organization),
    [organization],
  )

  const [draft, setDraft] = React.useState<StorefrontTokens>(savedTokens)
  const [previewToken, setPreviewToken] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabId>('brand')
  const [saving, setSaving] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)

  const dirty = !tokensEqual(draft, savedTokens)

  // Debounced preview save. When the form changes, after 400ms of
  // stillness POST the draft to /storefront/tokens/preview and store
  // the returned signed token so the iframe re-renders with it. We
  // don't preview when the form matches the saved state — that's the
  // initial load (just point the iframe at the public URL with no
  // token).
  React.useEffect(() => {
    if (!dirty) {
      setPreviewToken(null)
      return
    }
    const id = setTimeout(async () => {
      try {
        const result = (await (api as unknown as {
          POST: (
            path: string,
            init: {
              params: { path: { id: string } }
              body: StorefrontTokens
            },
          ) => Promise<{
            data?: { preview_token?: string }
            error?: unknown
          }>
        }).POST('/v1/organizations/{id}/storefront/tokens/preview', {
          params: { path: { id: organization.id } },
          body: draft,
        }))
        if (result?.data?.preview_token) {
          setPreviewToken(result.data.preview_token)
        }
      } catch {
        // Silent — the preview iframe just won't reflect the latest
        // unsaved tokens. The form itself still works and Save is
        // independent of the preview endpoint.
      }
    }, 400)
    return () => clearTimeout(id)
  }, [draft, dirty, organization.id])

  const handleSave = React.useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const result = await (api as unknown as {
        PATCH: (
          path: string,
          init: {
            params: { path: { id: string } }
            body: StorefrontTokens
          },
        ) => Promise<{ error?: { detail?: string } | null }>
      }).PATCH('/v1/organizations/{id}/storefront/tokens', {
        params: { path: { id: organization.id } },
        body: draft,
      })
      if (result?.error) {
        toast({
          title: 'Could not save theme',
          description: result.error.detail ?? 'Please try again in a moment.',
          variant: 'error',
        })
        return
      }
      toast({
        title: 'Theme saved',
        description: 'Your storefront updates within 60 seconds.',
      })
      // Soft-refresh the page so the server-rendered organization row
      // picks up the new theme_tokens (and the dirty state collapses).
      // Next.js server components only re-render on a full navigation
      // or router.refresh(); a hard reload is the simplest, most
      // reliable path on a dashboard surface.
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (e) {
      toast({
        title: 'Network error',
        description:
          e instanceof Error ? e.message : 'Could not reach the server.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [dirty, saving, organization.id, draft])

  const handleDiscard = React.useCallback(async () => {
    setDraft(savedTokens)
    try {
      await (api as unknown as {
        DELETE: (
          path: string,
          init: { params: { path: { id: string } } },
        ) => Promise<{ error?: unknown }>
      }).DELETE('/v1/organizations/{id}/storefront/tokens/preview', {
        params: { path: { id: organization.id } },
      })
    } catch {
      // Best-effort — the draft TTL will purge it within 30 minutes
      // anyway.
    }
    setPreviewToken(null)
  }, [savedTokens, organization.id])

  const handleReset = React.useCallback(async () => {
    if (resetting) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Reset your storefront theme to the Blyss defaults? Your products, prices, and reviews are not affected.',
      )
    ) {
      return
    }
    setResetting(true)
    try {
      await (api as unknown as {
        PATCH: (
          path: string,
          init: {
            params: { path: { id: string } }
            body: StorefrontTokens
          },
        ) => Promise<{ error?: { detail?: string } | null }>
      }).PATCH('/v1/organizations/{id}/storefront/tokens', {
        params: { path: { id: organization.id } },
        body: STOREFRONT_TOKENS_DEFAULTS,
      })
      toast({ title: 'Reset to defaults' })
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (e) {
      toast({
        title: 'Reset failed',
        description: e instanceof Error ? e.message : 'Try again.',
        variant: 'error',
      })
      setResetting(false)
    }
  }, [resetting, organization.id])

  const publicHref = `${SITE_BASE}/creators/${organization.slug}`
  const previewHref = previewToken
    ? `${publicHref}?preview_theme=${encodeURIComponent(previewToken)}`
    : publicHref

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Storefront</Eyebrow>
          <h1
            className={cn(
              typography.h2,
              'mt-2 text-[var(--text-primary)]',
            )}
          >
            Theme
          </h1>
          <p className="mt-2 max-w-[60ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            Customize how buyers see your storefront. Changes preview
            live below; nothing goes public until you click Save.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw size={13} aria-hidden="true" />
            Reset to defaults
          </button>
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            View public storefront
            <FiArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </header>

      {/* Tabs */}
      <nav
        aria-label="Storefront editor tabs"
        className="flex gap-1 border-b border-[var(--border)]"
      >
        {([
          { id: 'brand', label: 'Brand', disabled: false },
          { id: 'layout', label: 'Layout', disabled: true },
          { id: 'sections', label: 'Sections', disabled: true },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-2 px-4 py-3 font-sans text-[13px] font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b border-[var(--accent)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              tab.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {tab.label}
            {tab.disabled && (
              <span className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Soon
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Body — split layout: form on the left, preview on the right (desktop) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,560px)]">
        {/* Left: form */}
        <div className="flex flex-col gap-10">
          {activeTab === 'brand' && (
            <>
              {/* Preset bundles — one-click starter themes */}
              <section className="flex flex-col gap-4">
                <div>
                  <Eyebrow>Quick start</Eyebrow>
                  <h2 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                    Pick a starter theme.
                  </h2>
                  <p className="mt-1 max-w-[52ch] font-sans text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                    Curated bundles. Each picks an accent, font,
                    typography rule, and motion intensity for you.
                    Tweak any axis below afterwards.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {STOREFRONT_THEME_PRESETS.map((preset) => {
                    const accent = STOREFRONT_PALETTE[preset.tokens.accent]
                    const matched = findMatchingPreset(draft)
                    const selected = matched?.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setDraft(preset.tokens)}
                        aria-pressed={selected}
                        title={preset.description}
                        className={cn(
                          'flex flex-col items-stretch gap-2 rounded-md border bg-[var(--background)] p-3 text-left transition-colors',
                          selected
                            ? 'border-[var(--text-primary)]'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-12 w-full items-center justify-center rounded-sm font-display text-[15px] font-semibold tracking-[-0.02em]"
                          style={{
                            backgroundColor: accent.value,
                            color: accent.foreground,
                          }}
                        >
                          Aa
                        </span>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
                            {preset.name}
                          </span>
                          {selected && (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)]"
                            >
                              <FiCheck size={10} strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-2 font-sans text-[11px] leading-[1.4] text-[var(--text-muted)]">
                          {preset.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Accent picker */}
              <section className="flex flex-col gap-4">
                <div>
                  <Eyebrow>Accent</Eyebrow>
                  <h2 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                    Pick your storefront colour.
                  </h2>
                  <p className="mt-1 max-w-[52ch] font-sans text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                    The buttons, links, and accent rules on your
                    storefront use this. The marketplace header and
                    cart stay Blyss orange — buyers always know
                    they&rsquo;re on Blyss.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4">
                  {Object.values(STOREFRONT_PALETTE).map((accent) => {
                    const selected = draft.accent === accent.name
                    return (
                      <button
                        key={accent.name}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, accent: accent.name as AccentName }))
                        }
                        aria-pressed={selected}
                        className={cn(
                          'group relative flex flex-col items-stretch gap-2 rounded-md border bg-[var(--background)] p-3 text-left transition-colors',
                          selected
                            ? 'border-[var(--text-primary)]'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="block h-12 w-full rounded-sm"
                          style={{ backgroundColor: accent.value }}
                        />
                        <span className="flex items-baseline justify-between">
                          <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
                            {accent.label}
                          </span>
                          {selected && (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)]"
                            >
                              <FiCheck size={10} strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="font-sans text-[11px] leading-[1.4] text-[var(--text-muted)]">
                          {accent.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Headline font picker */}
              <section className="flex flex-col gap-4">
                <div>
                  <Eyebrow>Headline font</Eyebrow>
                  <h2 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                    Pick the typeface for your storefront headlines.
                  </h2>
                  <p className="mt-1 max-w-[52ch] font-sans text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                    Body text is always Inter — that stays consistent
                    across every Blyss storefront so buyers can read
                    your products without re-tuning their eyes.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(Object.keys(FONT_LABEL) as HeadlineFont[]).map((font) => {
                    const selected = draft.headline_font === font
                    return (
                      <button
                        key={font}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, headline_font: font }))
                        }
                        aria-pressed={selected}
                        className={cn(
                          'flex flex-col gap-2 rounded-md border bg-[var(--background)] p-4 text-left transition-colors',
                          selected
                            ? 'border-[var(--text-primary)]'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                          FONT_CLASS[font],
                        )}
                      >
                        <span
                          className="font-display text-[26px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]"
                          aria-hidden="true"
                        >
                          Make. Sell. Get paid.
                        </span>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
                            {FONT_LABEL[font]}
                          </span>
                          {selected && (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--background)]"
                            >
                              <FiCheck size={10} strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="font-sans text-[11px] leading-[1.4] text-[var(--text-muted)]">
                          {FONT_DESCRIPTION[font]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Display style + motion */}
              <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <div>
                    <Eyebrow>Display style</Eyebrow>
                    <h2 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                      Type rules.
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(DISPLAY_STYLE_LABEL) as DisplayStyle[]).map(
                      (style) => {
                        const selected = draft.display_style === style
                        return (
                          <label
                            key={style}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-md border bg-[var(--background)] p-3 transition-colors',
                              selected
                                ? 'border-[var(--text-primary)]'
                                : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                            )}
                          >
                            <input
                              type="radio"
                              name="display_style"
                              value={style}
                              checked={selected}
                              onChange={() =>
                                setDraft((d) => ({
                                  ...d,
                                  display_style: style,
                                }))
                              }
                              className="mt-1 h-4 w-4 shrink-0 accent-[var(--text-primary)]"
                            />
                            <span className="flex flex-col gap-0.5">
                              <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
                                {DISPLAY_STYLE_LABEL[style]}
                              </span>
                              <span className="font-sans text-[11px] text-[var(--text-muted)]">
                                {DISPLAY_STYLE_DESCRIPTION[style]}
                              </span>
                            </span>
                          </label>
                        )
                      },
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <Eyebrow>Motion</Eyebrow>
                    <h2 className="mt-2 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                      Animation intensity.
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(MOTION_LABEL) as Motion[]).map((m) => {
                      const selected = draft.motion === m
                      return (
                        <label
                          key={m}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-md border bg-[var(--background)] p-3 transition-colors',
                            selected
                              ? 'border-[var(--text-primary)]'
                              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                          )}
                        >
                          <input
                            type="radio"
                            name="motion"
                            value={m}
                            checked={selected}
                            onChange={() =>
                              setDraft((d) => ({ ...d, motion: m }))
                            }
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--text-primary)]"
                          />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
                              {MOTION_LABEL[m]}
                            </span>
                            <span className="font-sans text-[11px] text-[var(--text-muted)]">
                              {MOTION_DESCRIPTION[m]}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'layout' && (
            <ComingSoonCard
              tabName="Layout"
              copy="Pick from a curated set of storefront layouts — gallery, catalog, portfolio, studio. Coming in v2."
            />
          )}

          {activeTab === 'sections' && (
            <ComingSoonCard
              tabName="Sections"
              copy="Niche modules for your category — waveform players, recipe cards, before/after sliders, course outlines. Coming in v3."
            />
          )}
        </div>

        {/* Right: live preview */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between">
            <Eyebrow>Live preview</Eyebrow>
            <span className="font-sans text-[11px] text-[var(--text-muted)]">
              {dirty ? 'Unsaved changes' : 'Up to date'}
            </span>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
            {/* The iframe always points at the public /creators/{slug}.
                When draft tokens differ from saved, we append the
                signed preview_token so the public storefront renders
                with the unsaved tokens. The frame_id reloads the
                iframe each time previewToken changes — keying off
                the token avoids partial-state caches. */}
            <iframe
              key={previewToken ?? 'saved'}
              title="Storefront preview"
              src={previewHref}
              className="h-full min-h-[400px] w-full border-0"
              loading="lazy"
            />
            {/* Saved-state hint when no draft token */}
            {!previewToken && (
              <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-[var(--background)]/90 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] backdrop-blur">
                Saved theme
              </div>
            )}
          </div>
          <p className="font-sans text-[11px] leading-[1.5] text-[var(--text-muted)]">
            Buyers see your saved storefront. Click Save below to
            publish your changes.
          </p>
        </aside>
      </div>

      {/* Sticky save / discard toolbar — only renders when dirty */}
      {dirty && (
        <div
          role="region"
          aria-label="Unsaved theme changes"
          className="sticky bottom-0 z-10 flex flex-col-reverse items-stretch gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Avatar
              avatar_url={organization.avatar_url}
              name={organization.name}
              className="h-8 w-8"
            />
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              You have unsaved changes to {organization.name}&rsquo;s theme.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-4 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-busy={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const ComingSoonCard: React.FC<{ tabName: string; copy: string }> = ({
  tabName,
  copy,
}) => (
  <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8">
    <span className="rounded-full bg-[var(--surface-sunken)] px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
      Coming soon
    </span>
    <h2 className="font-display text-[20px] font-semibold text-[var(--text-primary)]">
      {tabName}
    </h2>
    <p className="max-w-[52ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
      {copy}
    </p>
    <Skeleton className="mt-4 h-32 w-full" />
  </div>
)
