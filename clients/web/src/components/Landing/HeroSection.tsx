import { schemas } from '@/lib/api'
import Link from 'next/link'

interface HeroSectionProps {
  featuredProducts: schemas['Product'][]
}

export default function HeroSection({ featuredProducts }: HeroSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-8 py-12 md:py-16">
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="font-headline mb-4 text-4xl font-black leading-[1.1] tracking-tight text-on-surface md:text-5xl">
            Kenyan Creativity, <span className="italic text-primary">Digitized</span>.
          </h1>
          <p className="mb-8 max-w-md text-lg leading-relaxed text-on-surface-variant">
            A curated marketplace for bold voices in Kenyan art and innovation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products">
              <button className="editorial-shadow rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-300 hover:bg-primary-container">
                Start Browsing
              </button>
            </Link>
            <Link href="/start">
              <button className="rounded-lg bg-surface-container-highest px-6 py-3 font-semibold text-on-surface-variant transition-all hover:opacity-90">
                Join as Creator
              </button>
            </Link>
          </div>
        </div>
        <div className="relative hidden h-full items-center justify-end md:col-span-5 md:flex">
          <div className="relative aspect-square w-full max-w-xs">
            <div className="editorial-shadow absolute right-0 top-0 z-20 aspect-square w-3/4 overflow-hidden rounded-xl bg-surface-container">
              {featuredProducts[0]?.medias?.[0] && (
                <img
                  className="h-full w-full object-cover"
                  src={featuredProducts[0].medias[0].public_url}
                  alt="Modern Kenyan digital portrait illustration"
                />
              )}
            </div>
            <div className="absolute bottom-4 left-0 z-10 aspect-square w-1/2 overflow-hidden rounded-xl bg-primary-container">
              {featuredProducts[1]?.medias?.[0] && (
                <img
                  className="h-full w-full object-cover opacity-80 mix-blend-overlay"
                  src={featuredProducts[1].medias[0].public_url}
                  alt="Abstract colorful textures and patterns"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
