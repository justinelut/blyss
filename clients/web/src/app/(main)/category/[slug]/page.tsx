import { Metadata } from "next";
import { unwrap } from "@/lib/api";
import { notFound } from "next/navigation";
import { JsonLd } from "@/design";
import { getServerSideAPI } from "@/utils/client/serverside";
import { CategoryPageClient } from "./CategoryPageClient";
import {
  getCategoryDescription,
  getCategoryTitle,
} from "@/lib/seo/category-copy";

const SITE = "https://blyss.co.ke";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Server-side data fetch for the category. We need this on the server
 * so we can:
 *
 *   - Generate accurate metadata (title, description, OG)
 *   - Emit BreadcrumbList + CollectionPage + ItemList JSON-LD
 *   - Keep page metadata and structured data aligned with the live category
 *
 * Errors are swallowed (returns null) so the client island still
 * renders its own "Category not found" state.
 */
async function fetchCategory(slug: string) {
  try {
    const api = await getServerSideAPI();
    return await unwrap(
      api.GET("/v1/categories/{slug}", { params: { path: { slug } } }),
    );
  } catch {
    return null;
  }
}

async function fetchCategoryProducts(slug: string) {
  try {
    const api = await getServerSideAPI();
    return await unwrap(
      api.GET("/v1/categories/{slug}/products", {
        params: { path: { slug }, query: { page: 1, limit: 24 } },
      }),
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchCategory(slug);
  const productsData = await fetchCategoryProducts(slug);

  if (!category) {
    return {
      title: "Category not found",
      robots: { index: false, follow: true },
    };
  }

  const title = getCategoryTitle(category.name);
  const description = getCategoryDescription(category.name);
  const url = `${SITE}/category/${slug}`;
  const hasProducts = (productsData?.pagination?.total_count ?? 0) > 0;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: hasProducts, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_KE",
      url,
      images: [
        {
          url: "https://blyss.co.ke/blyss-og-image.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryRoute({ params }: Props) {
  const { slug } = await params;
  const [category, productsData] = await Promise.all([
    fetchCategory(slug),
    fetchCategoryProducts(slug),
  ]);
  if (!category) notFound();

  // JSON-LD: BreadcrumbList + CollectionPage with the products as
  // ItemList. Google uses these to show "X has these products" rich
  // results under category-page hits.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categories",
        item: `${SITE}/categories`,
      },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `${SITE}/category/${slug}`,
            },
          ]
        : []),
    ],
  };

  const products = (productsData?.items ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const collectionLd = category
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category.name,
        description: category.description ?? undefined,
        url: `${SITE}/category/${slug}`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems:
            productsData?.pagination?.total_count ?? products.length,
          itemListElement: products.slice(0, 24).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE}/product/${p.id}`,
            name: p.name,
          })),
        },
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      {collectionLd && <JsonLd data={collectionLd} />}

      <CategoryPageClient params={params} />
    </>
  );
}
