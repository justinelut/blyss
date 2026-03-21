import { schemas } from '@/lib/api'
import Link from 'next/link'
import { CheckCircle, CircleArrowOutUpRight } from 'lucide-react'

interface SubscriptionsGridProps {
  subscriptions: schemas['Subscription'][]
  isLoading?: boolean
}

const stripMarkdown = (markdown: string): string => {
  if (!markdown) return ''
  return markdown
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n/g, ' ')
    .trim()
}

const SubscriptionCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8">
    <div className="mb-6 flex items-center gap-4">
      <div className="h-14 w-14 animate-pulse rounded-full bg-surface-container"></div>
      <div className="flex-1">
        <div className="mb-2 h-5 w-32 animate-pulse rounded bg-surface-container"></div>
        <div className="h-3 w-24 animate-pulse rounded bg-surface-container"></div>
      </div>
    </div>
    <div className="mb-10 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-0.5 h-4 w-4 animate-pulse rounded-full bg-surface-container"></div>
          <div className="h-4 flex-1 animate-pulse rounded bg-surface-container"></div>
        </div>
      ))}
    </div>
    <div className="border-t border-outline-variant/20 pt-6">
      <div className="mb-4 h-8 w-32 animate-pulse rounded bg-surface-container"></div>
      <div className="h-12 w-full animate-pulse rounded-xl bg-surface-container"></div>
    </div>
  </div>
)

export default function SubscriptionsGrid({ subscriptions, isLoading = false }: SubscriptionsGridProps) {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-headline mb-3 text-4xl">Featured Subscriptions</h2>
            <p className="max-w-xl text-base text-on-surface-variant">
              Support your favorite creators directly and unlock exclusive content every month.
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline underline-offset-4"
          >
            Explore all Circles{' '}
            <CircleArrowOutUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <SubscriptionCardSkeleton key={i} />
              ))}
            </>
          ) : (
            subscriptions.slice(0, 3).map((subscription, index) => {
              const organization = subscription.product.organization as schemas['Organization']
              const price = subscription.prices?.[0]
              const colors = ['primary', 'secondary', 'tertiary']
              const color = colors[index % 3]

              return (
                <div
                  key={subscription.id}
                  className="group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 transition-all duration-300 hover:border-primary/50"
                >
                  <div className={`absolute -mr-16 -mt-16 right-0 top-0 h-32 w-32 rounded-full bg-${color}/5 transition-transform duration-500 group-hover:scale-150`}></div>
                  <div className="relative mb-6 flex items-center gap-4">
                    <div className={`h-14 w-14 overflow-hidden rounded-full border-2 border-${color}/20`}>
                      {organization.avatar_url && (
                        <img
                          className="h-full w-full object-cover"
                          src={organization.avatar_url}
                          alt={organization.name}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-headline text-xl">{organization.name}</h3>
                      <p className={`text-xs font-bold uppercase tracking-widest text-${color}`}>
                        {subscription.product.name}
                      </p>
                    </div>
                  </div>
                  <ul className="relative mb-10 space-y-4">
                    {subscription.product.benefits?.slice(0, 3).map((benefit: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-on-surface-variant">
                        <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 text-${color}`} />
                        <span>{stripMarkdown(benefit.description)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="relative flex flex-col gap-4 border-t border-outline-variant/20 pt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-on-surface-variant">from</span>
                      <span className="font-headline text-2xl font-black">
                        {price && `KSh ${(price.price_amount / 100).toLocaleString()}`}
                      </span>
                      <span className="text-xs text-on-surface-variant">/mo</span>
                    </div>
                    <Link href={`/${organization.slug}`}>
                      <button className="w-full rounded-xl bg-on-surface py-3.5 text-sm font-bold text-surface transition-colors hover:bg-primary">
                        Join Circle
                      </button>
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
