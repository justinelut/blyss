import type { MetadataRoute } from "next";
import { getCategoryIntro } from "@/lib/seo/category-copy";
import { CONFIG } from "@/utils/config";

const SITE = "https://blyss.co.ke";
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://api.blyss.co.ke"
).replace(/\/$/, "");

export const revalidate = 3600;

interface CreatorLite {
  slug: string;
  modified_at?: string | null;
}

interface ProductLite {
  id: string;
  modified_at?: string | null;
}

interface CategoryLite {
  slug: string;
  product_count?: number | null;
  is_active?: boolean | null;
  modified_at?: string | null;
}

interface Paginated<T> {
  items?: T[];
  pagination?: { max_page?: number };
}

function lastModified(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function fetchPaginated<T>(path: string): Promise<T[]> {
  try {
    const items: T[] = [];
    let page = 1;
    let maxPage = 1;

    do {
      const url = new URL(path, `${API_BASE}/`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("page", String(page));
      const response = await fetch(url, { next: { revalidate } });
      if (!response.ok) return items;
      const data = (await response.json()) as Paginated<T>;
      items.push(...(data.items ?? []));
      maxPage = Math.min(data.pagination?.max_page ?? 1, 100);
      page += 1;
    } while (page <= maxPage);

    return items;
  } catch {
    return [];
  }
}

async function fetchCreators(): Promise<CreatorLite[]> {
  try {
    const response = await fetch(
      `${API_BASE}/v1/organizations/creators?limit=100`,
      { next: { revalidate } },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as
      | CreatorLite[]
      | { items?: CreatorLite[] };
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (CONFIG.IS_SANDBOX) return [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/start`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE}/marketplace`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/categories`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE}/creators`, changeFrequency: "daily", priority: 0.85 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/help`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/refunds`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    {
      url: `${SITE}/acceptable-use`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const [categories, creators, products] = await Promise.all([
    fetchPaginated<CategoryLite>("v1/categories"),
    fetchCreators(),
    fetchPaginated<ProductLite>("v1/products/public"),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter(
      (category) =>
        category.slug &&
        category.is_active !== false &&
        ((category.product_count ?? 0) > 0 ||
          Boolean(getCategoryIntro(category.slug))),
    )
    .map((category) => ({
      url: `${SITE}/category/${category.slug}`,
      lastModified: lastModified(category.modified_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const creatorRoutes: MetadataRoute.Sitemap = creators
    .filter((creator) => creator.slug)
    .map((creator) => ({
      url: `${SITE}/creators/${creator.slug}`,
      lastModified: lastModified(creator.modified_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product) => product.id)
    .map((product) => ({
      url: `${SITE}/product/${product.id}`,
      lastModified: lastModified(product.modified_at),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...creatorRoutes,
    ...productRoutes,
  ];
}
