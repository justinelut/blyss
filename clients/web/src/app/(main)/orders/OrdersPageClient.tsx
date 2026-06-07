'use client'

/**
 * /orders — marketplace-level "Your purchases".
 *
 * Aggregates every order behind every per-creator `customer` row that
 * shares the auth'd user's email. Per-creator portal at
 * /{slug}/portal/orders/{id} stays the canonical management surface
 * (refund, download, sub-cancel) — this page deep-links into it.
 *
 * Auth gate: signed-in users only. Guests bounce to /login with a
 * return path. The order confirmation email already deep-links guest
 * buyers to /{slug}/portal/authenticate so they're not stranded.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { FiArrowRight, FiPackage, FiUser } from 'react-icons/fi'

import { useMyOrders, type MeOrderItem } from '@/hooks/queries/me-orders'

const dateFmt = new Intl.DateTimeFormat('en-KE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const formatMoney = (amountMinor: number, currency: string): string => {
  const major = amountMinor / 100
  const c = (currency || 'KES').toUpperCase()
  if (c === 'KES') return `KSh ${major.toLocaleString('en-KE')}`
  if (c === 'USD') return `US$ ${major.toLocaleString('en-US')}`
  return `${c} ${major.toLocaleString()}`
}

const STATUS_COPY: Record<string, { label: string; tone: 'paid' | 'pending' | 'fail' }> = {
  paid: { label: 'Paid', tone: 'paid' },
  pending: { label: 'Pending', tone: 'pending' },
  refunded: { label: 'Refunded', tone: 'pending' },
  partially_refunded: { label: 'Partially refunded', tone: 'pending' },
  failed: { label: 'Failed', tone: 'fail' },
}

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_COPY[status] || { label: status, tone: 'pending' as const }
  const cls =
    cfg.tone === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : cfg.tone === 'fail'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium leading-none ${cls}`}
    >
      {cfg.label}
    </span>
  )
}

export const OrdersPageClient = () => {
  const { data, isLoading, isError, refetch } = useMyOrders(1, 50, true)

  // Group orders by creator slug so the aggregator reads as
  // 'creator A: [orders…], creator B: [orders…]' — mirroring how
  // buyers think about their purchases.
  const groups = useMemo(() => {
    const items = data?.items ?? []
    const map = new Map<string, { creator: MeOrderItem['creator']; rows: MeOrderItem[] }>()
    for (const it of items) {
      const slug = it.creator.slug
      const existing = map.get(slug)
      if (existing) existing.rows.push(it)
      else map.set(slug, { creator: it.creator, rows: [it] })
    }
    return Array.from(map.values())
  }, [data])

  const totalCount = data?.pagination?.total_count ?? 0

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-16 md:py-20">
      {/* Header */}
      <header className="max-w-[58ch]">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Your purchases
        </p>
        <h1 className="mt-4 font-display text-[clamp(40px,5.5vw,68px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
          Everything you&rsquo;ve bought.
        </h1>
        <p className="mt-6 font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
          Grouped by creator. To download files, manage subscriptions, or
          request a refund, open the creator&rsquo;s portal &mdash; that&rsquo;s
          where each purchase lives.
        </p>
      </header>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="mt-12 space-y-12">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-[var(--surface-sunken)]" />
              <div className="space-y-2">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-20 animate-pulse rounded-md bg-[var(--surface-sunken)]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-12 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-sans text-[14px] text-[var(--text-secondary)]">
            We couldn&rsquo;t load your purchases right now. Try again in a
            moment.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            Retry
            <FiArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : totalCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-12 space-y-12">
          {groups.map(({ creator, rows }) => (
            <CreatorGroup key={creator.slug} creator={creator} rows={rows} />
          ))}
        </div>
      )}
    </div>
  )
}

const CreatorGroup = ({
  creator,
  rows,
}: {
  creator: MeOrderItem['creator']
  rows: MeOrderItem[]
}) => {
  return (
    <section className="space-y-3">
      {/* Creator wordmark + slug */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${creator.slug}`}
          className="group flex items-center gap-3"
        >
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt={creator.name}
              className="h-9 w-9 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
              <FiUser size={14} aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)] group-hover:underline">
              {creator.name}
            </h2>
            <p className="font-sans text-[12px] text-[var(--text-muted)]">
              @{creator.slug}
            </p>
          </div>
        </Link>
        <Link
          href={`/${creator.slug}/portal/orders`}
          className="hidden font-sans text-[13px] font-medium text-[var(--accent)] hover:underline sm:inline-flex sm:items-center sm:gap-1.5"
        >
          Open portal
          <FiArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {/* Order rows */}
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-md border border-[var(--border)]">
        {rows.map((row) => (
          <OrderRow key={row.id} order={row} />
        ))}
      </ul>
    </section>
  )
}

const OrderRow = ({ order }: { order: MeOrderItem }) => {
  const total =
    order.subtotal_amount - order.discount_amount + order.tax_amount
  return (
    <li className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-4 sm:grid-cols-[64px,1fr,auto,auto] sm:gap-6 sm:px-6">
      {/* Thumbnail */}
      <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] sm:h-16 sm:w-16">
        {order.product?.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.product.thumbnail_url}
            alt={order.product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FiPackage
            size={18}
            className="text-[var(--text-muted)]"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0">
        <p className="truncate font-sans text-[15px] font-medium text-[var(--text-primary)]">
          {order.product?.name ?? 'Product unavailable'}
        </p>
        <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
          {dateFmt.format(new Date(order.created_at))} ·{' '}
          {order.invoice_number}
        </p>
        <div className="mt-1.5 sm:hidden">
          <StatusPill status={order.status} />
        </div>
      </div>

      {/* Status (desktop) */}
      <div className="hidden sm:block">
        <StatusPill status={order.status} />
      </div>

      {/* Amount + Manage */}
      <div className="flex flex-col items-end gap-1.5">
        <span className="font-sans text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
          {formatMoney(total, order.currency)}
        </span>
        <Link
          href={`/${order.creator.slug}/portal/orders/${order.id}`}
          className="font-sans text-[12px] font-medium text-[var(--accent)] hover:underline"
        >
          Manage
        </Link>
      </div>
    </li>
  )
}

const EmptyState = () => (
  <div className="mt-16 max-w-[58ch] rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-10">
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
      <FiPackage
        size={20}
        className="text-[var(--accent)]"
        aria-hidden="true"
      />
    </div>
    <h2 className="mt-5 font-display text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
      No purchases yet
    </h2>
    <p className="mt-2 font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
      Once you buy something on Blyss, it&rsquo;ll show up here. Until then,
      take a look around.
    </p>
    <Link
      href="/marketplace"
      className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 font-sans text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent-strong,#9a3412)]"
    >
      Browse the marketplace
      <FiArrowRight size={14} aria-hidden="true" />
    </Link>
  </div>
)
