'use client'

import { schemas } from '@/lib/api'
import { useState } from 'react'
import HeroSection from '@/components/Landing/HeroSection'
import CategoriesSection from '@/components/Landing/CategoriesSection'
import ProductsGrid from '@/components/Landing/ProductsGrid'
import SubscriptionsGrid from '@/components/Landing/SubscriptionsGrid'
import CreatorsSection from '@/components/Landing/CreatorsSection'
import TestimonialsSection from '@/components/Landing/TestimonialsSection'
import { Category } from '@/hooks/queries/categories'

interface HomePageProps {
  featuredProducts: schemas['Product'][]
  featuredSubscriptions: schemas['Subscription'][]
  trendingCreators: schemas['Organization'][]
  categories: Category[]
  isLoading?: boolean
}

export default function HomePage({
  featuredProducts,
  featuredSubscriptions,
  trendingCreators,
  categories,
  isLoading = false,
}: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('digital-art')

  return (
    <div className="bg-background">
      <main className="pt-16">
        <HeroSection featuredProducts={featuredProducts} />
        <CategoriesSection
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
        <ProductsGrid products={featuredProducts} isLoading={isLoading} />
        <SubscriptionsGrid subscriptions={featuredSubscriptions} isLoading={isLoading} />
        <CreatorsSection creators={trendingCreators} isLoading={isLoading} />
        <TestimonialsSection />
      </main>
    </div>
  )
}
