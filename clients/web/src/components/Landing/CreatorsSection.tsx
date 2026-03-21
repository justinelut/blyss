import { schemas } from '@/lib/api'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface CreatorsSectionProps {
  creators: schemas['Organization'][]
  isLoading?: boolean
}

const CreatorCardSkeleton = () => (
  <div className="flex items-center gap-5 rounded-xl bg-surface-container p-6">
    <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-surface-container-low"></div>
    <div className="grow">
      <div className="mb-2 h-5 w-32 animate-pulse rounded bg-surface-container-low"></div>
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-surface-container-low"></div>
      <div className="h-7 w-20 animate-pulse rounded-full bg-surface-container-low"></div>
    </div>
  </div>
)

export default function CreatorsSection({ creators, isLoading = false }: CreatorsSectionProps) {
  return (
    <section className="mx-auto max-w-7xl overflow-hidden px-8 py-24">
      <div className="flex flex-col items-center gap-12 md:flex-row">
        <div className="md:w-1/3">
          <h2 className="font-headline mb-4 text-4xl">Trending Voices</h2>
          <p className="mb-6 text-base text-on-surface-variant">
            Meet the visionaries redefining Kenyan digital artistry.
          </p>
          <Link href="/creators">
            <button className="group flex items-center gap-2 text-sm font-bold text-secondary">
              See all creators{' '}
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:w-2/3">
          {isLoading ? (
            <>
              {[...Array(2)].map((_, i) => (
                <CreatorCardSkeleton key={i} />
              ))}
            </>
          ) : (
            creators.slice(0, 2).map((creator) => (
              <div
                key={creator.id}
                className="editorial-shadow group flex items-center gap-5 rounded-xl bg-surface-container p-6 transition-all duration-300 hover:bg-white"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-surface-container-lowest">
                  {creator.avatar_url && (
                    <img
                      className="h-full w-full object-cover"
                      src={creator.avatar_url}
                      alt={creator.name}
                    />
                  )}
                </div>
                <div className="grow">
                  <h4 className="font-headline mb-0.5 text-lg">{creator.name}</h4>
                  <p className="mb-3 text-xs text-on-surface-variant">Visual Storyteller</p>
                  <button className="rounded-full bg-on-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface transition-colors hover:bg-secondary">
                    Follow
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
