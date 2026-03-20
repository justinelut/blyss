'use client'

import Button from '@/components/atoms/Button'
import { useRouter } from 'next/navigation'

interface HeroSectionProps {
  className?: string
}

export function HeroSection({ className }: HeroSectionProps) {
  const router = useRouter()

  return (
    <section
      className={`bg-gradient-to-br from-blue-50 to-indigo-100 py-16 dark:from-gray-900 dark:to-gray-800 ${className || ''}`}
    >
      <div className="container mx-auto px-4 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
          Discover Amazing Products from Kenyan Creators
        </h1>
        <p className="mb-8 text-lg text-gray-700 md:text-xl dark:text-gray-300">
          Support local creators and find unique digital products, courses, and
          more
        </p>
        <Button size="lg" onClick={() => router.push('/signup?type=creator')}>
          Become a Creator
        </Button>
      </div>
    </section>
  )
}
