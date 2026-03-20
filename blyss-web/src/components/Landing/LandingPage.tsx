'use client'

import { ProductCard } from '@/components/Products/ProductCard'
import { useCategories } from '@/hooks/queries/categories'
import { useCreators } from '@/hooks/queries/creators'
import { usePublicProducts } from '@/hooks/queries/products'
import Button from '@/components/atoms/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Section } from './Section'

export default function Page() {
  return (
    <div className="flex flex-col">
      <PageContent />
    </div>
  )
}

export const PageContent = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch featured products
  const { data: featuredProductsData } = usePublicProducts({
    limit: 12,
    sort: 'newest',
  })

  // Fetch trending products
  const { data: trendingProductsData } = usePublicProducts({
    limit: 8,
    sort: 'newest',
  })

  // Fetch categories
  const { data: categoriesData } = useCategories()

  // Fetch featured creators
  const { data: creatorsData } = useCreators({
    limit: 6,
  })

  const featuredProducts = featuredProductsData?.items || []
  const trendingProducts = trendingProductsData?.items || []
  const categories = categoriesData?.items || []
  const creators = creatorsData?.items || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      {/* Minimal Hero - Modern Marketplace Style */}
      <Section className="flex flex-col items-center gap-y-6 pt-8 md:pt-12">
        <div className="flex w-full max-w-4xl flex-col items-center gap-y-4 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Discover Digital Products
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search for products, creators, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
              />
              <Button type="submit" size="lg">
                Search
              </Button>
            </div>
          </form>
        </div>
      </Section>

      {/* Featured Products */}
      <Section className="flex flex-col gap-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <Link href="/marketplace">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.slice(0, 8).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                organization={product.organization}
                currency="KES"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              No featured products available yet
            </p>
          </div>
        )}
      </Section>

      {/* Categories Showcase */}
      {categories.length > 0 && (
        <Section className="flex flex-col gap-y-8" border>
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Browse by Category</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => {
              const colors = [
                {
                  bg: 'bg-orange-50 dark:bg-orange-800',
                  text: 'text-orange-500 dark:text-orange-200',
                  hover: 'hover:bg-orange-100 dark:hover:bg-orange-700',
                },
                {
                  bg: 'bg-teal-50 dark:bg-teal-800',
                  text: 'text-teal-500 dark:text-teal-200',
                  hover: 'hover:bg-teal-100 dark:hover:bg-teal-700',
                },
                {
                  bg: 'bg-amber-50 dark:bg-amber-800',
                  text: 'text-amber-500 dark:text-amber-200',
                  hover: 'hover:bg-amber-100 dark:hover:bg-amber-700',
                },
                {
                  bg: 'bg-gray-100 dark:bg-gray-800',
                  text: 'text-gray-700 dark:text-gray-300',
                  hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
                },
              ]
              const colorScheme = colors[index % colors.length]

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className={`group flex flex-col items-center gap-3 rounded-2xl p-6 transition-all ${colorScheme.bg} ${colorScheme.hover}`}
                >
                  <div className="text-center">
                    <h3 className={`text-lg font-bold ${colorScheme.text}`}>
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {category.product_count || 0} products
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <Section className="flex flex-col gap-y-8" border>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">🔥 Trending Now</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trendingProducts.slice(0, 4).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                organization={product.organization}
                currency="KES"
              />
            ))}
          </div>
        </Section>
      )}

      {/* Featured Creators */}
      {creators.length > 0 && (
        <Section className="flex flex-col gap-y-8" border>
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Featured Creators</h2>
            <Link href="/creators">
              <Button variant="outline">View All Creators</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creators.slice(0, 6).map((creator) => (
              <Link
                key={creator.id}
                href={`/${creator.slug}`}
                className="group flex items-center gap-4 rounded-lg border border-gray-200 p-6 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                      {creator.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{creator.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {creator.product_count || 0} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Newsletter Signup */}
      <Section
        className="flex flex-col items-center gap-y-6 text-center"
        border
      >
        <h2 className="text-3xl font-bold">Stay Updated</h2>
        <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Get the latest products, creator stories, and marketplace updates
          delivered to your inbox
        </p>
        <Link href="/newsletter">
          <Button size="lg">Subscribe to Newsletter</Button>
        </Link>
      </Section>

      {/* Call to Action */}
      <Section className="flex flex-col items-center gap-y-6 text-center">
        <h2 className="text-3xl font-bold">Ready to Start Selling?</h2>
        <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Join thousands of creators who are already monetizing their digital
          products
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/start">
            <Button size="lg">Become a Creator</Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" size="lg">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </Section>
    </>
  )
}
