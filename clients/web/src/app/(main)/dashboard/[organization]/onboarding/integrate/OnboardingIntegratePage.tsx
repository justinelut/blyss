'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, Copy, ExternalLink, Share2 } from 'lucide-react'
import type { schemas } from '@/lib/api'
import { BlyssLogo, Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'

type Organization = schemas['Organization']
type Product = schemas['Product']

interface Props {
  organization: Organization
  product: Product
}

const STOREFRONT_BASE =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'https://blyss.co.ke'

export default function OnboardingIntegratePage({
  organization,
  product,
}: Props) {
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const productUrl = `${STOREFRONT_BASE}/product/${product.id}`
  const storefrontUrl = `${STOREFRONT_BASE}/${organization.slug}`
  const dashboardUrl = `/dashboard/${organization.slug}`

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1800)
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[920px] px-6 py-16 md:px-12 md:py-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-12"
        >
          <BlyssLogo size="lg" />
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          <Eyebrow accent>{product.name}</Eyebrow>
          <h1
            className={cn(
              typography.h1,
              'mt-4 max-w-[20ch] text-[clamp(36px,5vw,60px)]',
            )}
          >
            Live. Now share it.
          </h1>
          <p className="mt-6 max-w-[58ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
            Your product is published and ready for buyers. Drop the link
            anywhere — your bio, your community, your newsletter — and the
            first sale takes care of itself.
          </p>
        </motion.div>

        <div className="mt-12 flex flex-col gap-4">
          {/* Product link */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.2 }}
            className="rounded-xl border border-[var(--accent)]/30 bg-[var(--surface-elevated)] p-6 md:p-8"
          >
            <Eyebrow>Product link</Eyebrow>
            <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
              Direct link to the {product.name} purchase page.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-[13px] text-[var(--text-primary)]">
                {productUrl}
              </code>
              <button
                type="button"
                onClick={() => copy(productUrl, 'product')}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-4 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                {copiedKey === 'product' ? (
                  <>
                    <Check size={14} strokeWidth={2} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={2} /> Copy link
                  </>
                )}
              </button>
              <Link
                href={productUrl}
                target="_blank"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-4 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
              >
                Preview <ExternalLink size={14} strokeWidth={2} />
              </Link>
            </div>
          </motion.div>

          {/* Storefront link */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.28 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                <Share2 size={18} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">
                  Your storefront
                </h2>
                <p className="mt-1 font-sans text-[14px] text-[var(--text-secondary)]">
                  Share this for everything you sell, not just one product.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-[13px]">
                    {storefrontUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(storefrontUrl, 'storefront')}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-4 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    {copiedKey === 'storefront' ? (
                      <>
                        <Check size={14} strokeWidth={2} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} strokeWidth={2} /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom actions */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.4 }}
          className="mt-12 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-8"
        >
          <Link
            href={`${dashboardUrl}/products/${product.id}`}
            className="font-sans text-[14px] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            Edit this product
          </Link>
          <Link
            href={dashboardUrl}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Go to dashboard
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
