'use client'

import Button from '@/components/atoms/Button'
import Link from './LocaleLink'

interface HeroSectionProps {
  title: string
  subtitle: string
  primaryCTA: { text: string; href: string }
  secondaryCTA: { text: string; href: string }
  backgroundImage?: string
}

export const HeroSection = ({
  title,
  subtitle,
  primaryCTA,
  secondaryCTA,
  backgroundImage,
}: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#fcf9f7] dark:bg-[#1b1c1b]">
      {/* Background Image with Gradient Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b1c1b]/80 to-[#1b1c1b]/40 dark:from-[#1b1c1b]/90 dark:to-[#1b1c1b]/60" />
        </div>
      )}

      {/* Content */}
      <div className="relative">
        {/* Desktop: 7/5 Asymmetric Grid */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - 7/12 */}
          <div className="col-span-7 flex flex-col justify-center py-20 pl-12">
            <h1 className="font-epilogue mb-6 text-6xl font-bold leading-tight tracking-tight text-[#1b1c1b] dark:text-white">
              {title}
            </h1>
            <p className="mb-8 text-xl leading-relaxed text-[#594139] dark:text-gray-300">
              {subtitle}
            </p>
            <div className="flex items-center gap-4">
              <Link href={primaryCTA.href}>
                <Button size="lg" className="px-8">
                  {primaryCTA.text}
                </Button>
              </Link>
              <Link href={secondaryCTA.href}>
                <Button variant="outline" size="lg" className="px-8">
                  {secondaryCTA.text}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - 5/12 */}
          <div className="col-span-5 flex items-center justify-center py-20 pr-12">
            <div className="h-full w-full rounded-lg bg-gradient-to-br from-[#a73400]/10 to-[#006972]/10 dark:from-[#a73400]/20 dark:to-[#006972]/20" />
          </div>
        </div>

        {/* Mobile & Tablet: Stacked Layout */}
        <div className="flex flex-col gap-8 py-12 px-6 lg:hidden">
          <div className="flex flex-col items-center text-center">
            <h1 className="font-epilogue mb-4 text-4xl font-bold leading-tight tracking-tight text-[#1b1c1b] dark:text-white md:text-5xl">
              {title}
            </h1>
            <p className="mb-6 text-lg leading-relaxed text-[#594139] dark:text-gray-300">
              {subtitle}
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={primaryCTA.href} className="w-full sm:w-auto">
                <Button size="lg" fullWidth className="sm:px-8">
                  {primaryCTA.text}
                </Button>
              </Link>
              <Link href={secondaryCTA.href} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth className="sm:px-8">
                  {secondaryCTA.text}
                </Button>
              </Link>
            </div>
          </div>

          <div className="h-64 w-full rounded-lg bg-gradient-to-br from-[#a73400]/10 to-[#006972]/10 dark:from-[#a73400]/20 dark:to-[#006972]/20" />
        </div>
      </div>
    </section>
  )
}
