import { Metadata } from 'next'
import { unwrap } from '@/lib/api'
import { JsonLd } from '@/design'
import { getServerSideAPI } from '@/utils/client/serverside'
import { CategoryPageClient } from './CategoryPageClient'
import {
  getCategoryIntro,
  type CategoryIntro,
} from '@/lib/seo/category-copy'

const SITE = 'https://blyss.co.ke'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Server-side data fetch for the category. We need this on the server
 * so we can:
 *
 *   - Generate accurate metadata (title, description, OG)
 *   - Emit BreadcrumbList + CollectionPage + ItemList JSON-LD
 *   - Render the long-form SEO intro copy in the initial HTML (Google
 *     can't index content rendered only on the client)
 *
 * Errors are swallowed (returns null) so the client island still
 * renders its own "Category not found" state.
 */
async function fetchCategory(slug: string) {
  try {
    const api = await getServerSideAPI()
    return await unwrap(
      api.GET('/v1/categories/{slug}', { params: { path: { slug } } }),
    )
  } catch {
    return null
  }
}

async function fetchCategoryProducts(slug: string) {
  try {
    const api = await getServerSideAPI()
    return await unwrap(
      api.GET('/v1/categories/{slug}/products', {
        params: { path: { slug }, query: { page: 1, limit: 24 } },
      }),
    )
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await fetchCategory(slug)
  const intro = getCategoryIntro(slug)

  if (!category) {
    return {
      title: 'Category not found',
      robots: { index: false, follow: true },
    }
  }

  // Prefer the curated SEO copy when we have one (top categories);
  // fall back to the category description (creator-edited in the
  // backoffice) or a generated default.
  const title =
    intro?.title ?? `Buy ${category.name} · Instant download · Blyss`
  const description =
    intro?.description ??
    category.description ??
    `Buy ${category.name.toLowerCase()} from creators. Pay with M-Pesa, Visa, or Mastercard. Instant download after checkout.`
  const url = `${SITE}/category/${slug}`

  return {
    title,
    description,
    keywords: intro?.keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_KE',
      url,
      images: [
        {
          url: 'https://cdn.blyss.co.ke/brand/og-default.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function CategoryRoute({ params }: Props) {
  const { slug } = await params
  const [category, productsData] = await Promise.all([
    fetchCategory(slug),
    fetchCategoryProducts(slug),
  ])
  const intro = getCategoryIntro(slug)

  // JSON-LD: BreadcrumbList + CollectionPage with the products as
  // ItemList. Google uses these to show "X has these products" rich
  // results under category-page hits.
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Categories',
        item: `${SITE}/categories`,
      },
      ...(category
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: category.name,
              item: `${SITE}/category/${slug}`,
            },
          ]
        : []),
    ],
  }

  const products = (productsData?.items ?? []) as Array<{
    id: string
    name: string
  }>
  const collectionLd = category
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        description: category.description ?? undefined,
        url: `${SITE}/category/${slug}`,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: productsData?.pagination?.total_count ?? products.length,
          itemListElement: products.slice(0, 24).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE}/product/${p.id}`,
            name: p.name,
          })),
        },
      }
    : null

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      {collectionLd && <JsonLd data={collectionLd} />}

      {/* Server-rendered long-form intro for SEO. Sits ABOVE the
          interactive client grid so Google reads it first. The
          client island then renders the filter rail + product grid
          + pagination. Categories without curated copy fall back to
          the database description (creator-edited). */}
      {intro && (
        <CategoryIntroBlock intro={intro} categoryName={category?.name ?? ''} />
      )}

      <CategoryPageClient params={params} />
    </>
  )
}

/**
 * Editorial intro block — long-form copy targeting the category's
 * top long-tail query. Only rendered for categories with curated
 * copy in `category-copy.ts`. Sits between the navigation strip
 * and the product grid.
 *
 * Per blyss-design §3.3: Inter Display H2 + Inter body. No emoji,
 * no shouted CTAs, no "discover" / "explore" filler verbs.
 */
function CategoryIntroBlock({
  intro,
  categoryName,
}: {
  intro: CategoryIntro
  categoryName: string
}) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-10 md:px-16 md:pt-12">
      <div className="max-w-[68ch]">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          {intro.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-[clamp(24px,3vw,36px)] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          {intro.heading}
        </h2>
        {intro.paragraphs.map((p, i) => (
          <p
            key={i}
            className="mt-4 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]"
          >
            {p}
          </p>
        ))}
        {intro.bulletHeading && intro.bullets && (
          <>
            <h3 className="mt-8 font-display text-[18px] font-semibold leading-[1.2] text-[var(--text-primary)]">
              {intro.bulletHeading}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {intro.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]"
                  />
                  {b}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
