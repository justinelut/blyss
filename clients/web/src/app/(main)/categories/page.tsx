import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { api } from '@/utils/client'
import { JsonLd } from '@/design'
import { CategoriesIndexPage } from './CategoriesIndexPage'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'All categories · Browse templates, ebooks, beats, presets, courses',
  description:
    'Every Blyss category. Notion templates, Lightroom presets, ebooks, beats, online courses, fonts, stock music, Canva templates, photography. Pay with M-Pesa or card.',
  keywords:
    'digital product categories, buy notion templates, buy lightroom presets, buy ebooks, buy beats, buy online courses, buy canva templates, buy fonts, buy stock music, buy photography, digital products kenya',
  alternates: { canonical: 'https://blyss.co.ke/categories' },
  openGraph: {
    title: 'All Blyss categories',
    description:
      'Notion templates, Lightroom presets, ebooks, beats, courses, Canva templates, fonts, photography, stock music. M-Pesa or card.',
    type: 'website',
    locale: 'en_KE',
    url: 'https://blyss.co.ke/categories',
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
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blyss.co.ke/' },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: 'https://blyss.co.ke/categories' },
    ],
  }
  // CollectionPage + ItemList of category-pages. Rich-snippets show
  // the category list under the search result.
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Blyss categories',
    url: 'https://blyss.co.ke/categories',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categories.length,
      itemListElement: categories.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        url: `https://blyss.co.ke/category/${c.slug}`,
      })),
    },
  }
  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={collectionLd} />
      <CategoriesIndexPage categories={categories} />
    </>
  )
}
