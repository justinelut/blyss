import { unwrap, schemas } from "@/lib/api";
import { createServerSideAPI } from "@/utils/client";
import { getServerGeo } from "@/lib/geo/server";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import HomePage from "./HomePage";
import type { CategoryTile } from "@/components/Marketplace/BrowseByCraft";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: "Blyss | Digital Products Marketplace for Kenyan Creators",
  },
  description:
    "Browse digital products and subscriptions from independent Kenyan creators. Listing details, prices, delivery terms, and payment options are shown for each purchase.",
  alternates: { canonical: "https://blyss.co.ke" },
  openGraph: {
    siteName: "Blyss",
    type: "website",
    title: "Blyss — Templates, Ebooks, Beats from Independent Creators",
    description:
      "Digital products and subscriptions from independent creators. See each listing for product and checkout details.",
    images: [
      {
        url: "https://blyss.co.ke/blyss-og-image.png",
        width: 1200,
        height: 630,
        alt: "Blyss independent creator marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blyss — Independent Creator Marketplace",
    description:
      "Digital products and subscriptions from independent creators.",
    images: ["https://blyss.co.ke/blyss-og-image.png"],
  },
};

const marketplaceApi = async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  return createServerSideAPI(headersList, cookieStore);
};

async function getFeaturedProducts(): Promise<schemas["Product"][]> {
  try {
    const serverApi = await marketplaceApi();
    const { currency } = await getServerGeo();
    const featured = await unwrap(
      serverApi.GET("/v1/products/public", {
        params: {
          query: { is_featured: true, limit: 9, page: 1, currency },
        },
      }),
    );
    if (featured.items?.length) {
      return featured.items as schemas["Product"][];
    }

    const recent = await unwrap(
      serverApi.GET("/v1/products/public", {
        params: {
          query: { sort: "newest", limit: 9, page: 1, currency },
        },
      }),
    );
    return (recent.items ?? []) as schemas["Product"][];
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return [];
  }
}

async function getNewestProducts(): Promise<schemas["Product"][]> {
  try {
    const serverApi = await marketplaceApi();
    const { currency } = await getServerGeo();
    const result = await unwrap(
      serverApi.GET("/v1/products/public", {
        params: {
          query: { sort: "newest", limit: 16, page: 1, currency },
        },
      }),
    );
    return (result.items ?? []) as schemas["Product"][];
  } catch (error) {
    console.error("Failed to fetch newest products:", error);
    return [];
  }
}

async function getFeaturedSubscriptions(): Promise<schemas["Product"][]> {
  try {
    const serverApi = await marketplaceApi();
    const { currency } = await getServerGeo();
    const recurring = await unwrap(
      serverApi.GET("/v1/products/public", {
        params: {
          query: { is_recurring: true, limit: 6, page: 1, currency },
        },
      }),
    );
    return (recurring.items ?? []) as schemas["Product"][];
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }
}

async function getTrendingCreators(): Promise<schemas["Organization"][]> {
  try {
    const serverApi = await marketplaceApi();
    const directory = await unwrap(
      serverApi.GET("/v1/organizations/creators", {
        params: { query: { limit: 6 } },
      }),
    );
    const items = Array.isArray(directory)
      ? directory
      : ((directory as { items?: unknown[] }).items ?? []);
    return items as schemas["Organization"][];
  } catch (error) {
    console.error("Failed to fetch creators:", error);
    return [];
  }
}

async function getCategories(): Promise<CategoryTile[]> {
  try {
    const serverApi = await marketplaceApi();
    const result = await unwrap(serverApi.GET("/v1/categories/", {}));
    return (result.items ?? [])
      .filter((category: any) => category.product_count > 0)
      .slice(0, 8)
      .map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      cover_image_url: category.cover_image_url ?? null,
      product_count: category.product_count,
      }));
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export default async function Page() {
  const [
    featuredProducts,
    newestProducts,
    featuredSubscriptions,
    trendingCreators,
    categories,
    geo,
  ] = await Promise.all([
    getFeaturedProducts(),
    getNewestProducts(),
    getFeaturedSubscriptions(),
    getTrendingCreators(),
    getCategories(),
    getServerGeo(),
  ]);

  return (
    <HomePage
      featuredProducts={featuredProducts}
      newestProducts={newestProducts}
      featuredSubscriptions={featuredSubscriptions}
      trendingCreators={trendingCreators}
      categories={categories}
      country={geo.country}
      currency={geo.currency}
    />
  );
}
