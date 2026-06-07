import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { api } from '@/utils/client'
import { CategoriesIndexPage } from './CategoriesIndexPage'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'All categories · Blyss',
  description:
    'Browse every category on Blyss — templates, beats, ebooks, courses, presets, photography, and more.',
  alternates: { canonical: 'https://blyss.co.ke/categories' },
  openGraph: {
    title: 'All categories · Blyss',
    description:
      'Every category on Blyss in one place. Templates, beats, ebooks, courses, presets, photography, and more.',
    type: 'website',
    locale: 'en_KE',
  },
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  product_count: number
}

async function fetchCategories(): Promise<CategoryRow[]> {
  try {
    const result = await unwrap(api.GET('/v1/categories/', {}))
    return ((result.items ?? []) as Array<{
      id: string
      name: string
      slug: string
      description: string | null
      product_count: number
      is_active: boolean
    }>)
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        product_count: c.product_count,
      }))
  } catch {
    return []
  }
}

export default async function Page() {
  const categories = await fetchCategories()
  return <CategoriesIndexPage categories={categories} />
}
