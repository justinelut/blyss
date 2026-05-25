'use client'

import { useState } from 'react'
import { schemas } from '@/lib/api'
import { LegalDoc, typography } from '@/design'
import { cn } from '@/lib/utils'
import { FileText, Check } from 'lucide-react'

type Product = schemas['Product']

type TabId = 'description' | 'included' | 'benefits' | 'reviews'

interface Tab {
  id: TabId
  label: string
  disabled?: boolean
}

export interface ProductTabsProps {
  product: Product
  /** Reviews rendered externally — passed as children for the reviews panel */
  reviewsContent?: React.ReactNode
}

/**
 * ProductTabs — Description / What's included / Benefits / Reviews.
 * Per plan §6.5 step 4.
 */
export const ProductTabs = ({ product, reviewsContent }: ProductTabsProps) => {
  const [active, setActive] = useState<TabId>('description')

  const benefits = product.benefits ?? []
  const medias = product.medias ?? []
  const hasDescription = !!product.description?.trim()
  const hasIncludes = medias.length > 0 || product.is_recurring
  const hasBenefits = benefits.length > 0

  const tabs: Tab[] = [
    { id: 'description', label: 'Description', disabled: !hasDescription },
    { id: 'included', label: "What's included", disabled: !hasIncludes },
    { id: 'benefits', label: 'Benefits', disabled: !hasBenefits },
    { id: 'reviews', label: 'Reviews' },
  ]

  return (
    <div>
      {/* Tab strip */}
      <div className="border-b border-[var(--border)]">
        <nav aria-label="Product details" className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
          <div className="flex min-w-max items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === active}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && setActive(tab.id)}
                className={cn(
                  'relative inline-flex h-12 items-center px-4 font-sans text-[14px] font-medium transition-colors',
                  tab.id === active
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  tab.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {tab.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 bottom-0 h-[2px] rounded-full',
                    tab.id === active ? 'bg-[var(--accent)]' : 'bg-transparent',
                  )}
                />
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Panels */}
      <div className="py-8">
        {active === 'description' && hasDescription && (
          <LegalDoc>{product.description!}</LegalDoc>
        )}

        {active === 'included' && (
          <div className="flex flex-col gap-3">
            {medias.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md bg-[var(--surface-sunken)] p-3"
              >
                <FileText size={18} className="shrink-0 text-[var(--text-muted)]" />
                <span className="flex-1 font-sans text-[14px] text-[var(--text-primary)]">
                  {(m as any).name || `File ${i + 1}`}
                </span>
                <span className="font-sans text-[12px] text-[var(--text-muted)]">
                  {((m as any).mime_type ?? '').split('/')[1]?.toUpperCase() || ''}
                </span>
              </div>
            ))}
            {product.is_recurring && benefits.length > 0 && (
              <div className="mt-4">
                <p className={cn(typography.small, 'mb-3 text-[var(--text-muted)]')}>
                  Subscription includes:
                </p>
                <ul className="flex flex-col gap-2">
                  {benefits.map((b: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 font-sans text-[14px] text-[var(--text-secondary)]">
                      <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                      {b.description || b.name || 'Benefit'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {active === 'benefits' && (
          <ul className="flex flex-col gap-3">
            {benefits.map((b: any, i: number) => (
              <li key={i} className="flex items-start gap-3 font-sans text-[15px] text-[var(--text-secondary)]">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{b.name || b.description}</span>
                  {b.description && b.name && (
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">{b.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {active === 'reviews' && (
          <div>{reviewsContent ?? <EmptyReviews />}</div>
        )}
      </div>
    </div>
  )
}

function EmptyReviews() {
  return (
    <div className="max-w-[44ch]">
      <h3 className={cn(typography.h4, 'text-[var(--text-primary)]')}>No reviews yet.</h3>
      <p className={cn(typography.body, 'mt-3 text-[var(--text-secondary)]')}>
        Be the first to leave a review after purchasing this product.
      </p>
    </div>
  )
}
