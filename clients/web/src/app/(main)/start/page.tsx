import { Metadata } from "next";
import { unwrap } from "@/lib/api";
import { api } from "@/utils/client";
import { JsonLd } from "@/design";
import { StartLanding } from "./StartLanding";
import type { ProductCategory, CreatorCategory } from "./StartLanding";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sell digital products in Kenya · M-Pesa payouts",
  description:
    "Open a storefront for digital products and subscriptions. Buyers pay with the methods available at checkout; creators connect a Paystack payout destination.",
  keywords:
    "sell digital products kenya, sell ebook kenya, sell ebooks kenya, sell beats kenya, sell presets kenya, kenya creator marketplace, mpesa creator payouts, kenya online business, blyss storefront",
  alternates: { canonical: "https://blyss.co.ke/start" },
  openGraph: {
    title: "Sell digital products in Kenya · Start selling on Blyss",
    description:
      "Create a storefront for digital products and subscriptions. Payment methods and prices are shown at checkout; payouts are handled through Paystack.",
    type: "website",
    locale: "en_KE",
    url: "https://blyss.co.ke/start",
    images: [
      {
        url: "https://blyss.co.ke/blyss-og-image.png",
        width: 1200,
        height: 630,
        alt: "Start selling on Blyss",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell digital products in Kenya",
    description:
      "Sell digital products and subscriptions on Blyss. Connect a Paystack payout destination during setup.",
    images: ["https://blyss.co.ke/blyss-og-image.png"],
  },
};

/**
 * Fetch the live product-category list. We use this as the "What can I
 * sell?" answer so the page reflects what the marketplace
 * actually accepts (Templates, Ebooks, Beats and Music, Presets,
 * Courses, Photography, Software …) rather than 6 hardcoded examples
 * that drift out of sync. Errors are swallowed — the start page must
 * render even if the categories endpoint flaps; StartLanding falls
 * back to a curated short list in that case.
 */
async function fetchProductCategories(): Promise<ProductCategory[]> {
  try {
    const result = await unwrap(api.GET("/v1/categories/", {}));
    return (
      (result.items ?? []) as Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        product_count: number;
        is_active: boolean;
      }>
    )
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        product_count: c.product_count,
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch the live creator-category list. Used to answer "Who else is
 * already?" — designers, photographers, musicians, writers
 * etc. Same fail-soft behaviour as fetchProductCategories.
 */
async function fetchCreatorCategories(): Promise<CreatorCategory[]> {
  try {
    const result = (await unwrap(
      (api as any).GET("/v1/creator-categories/", {}),
    )) as Array<{ id: string; slug: string; name: string }>;
    return (result ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));
  } catch {
    return [];
  }
}

export default async function Page() {
  const [productCategories, creatorCategories, stats] = await Promise.all([
    fetchProductCategories(),
    fetchCreatorCategories(),
    fetchMarketplaceStats(),
  ]);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://blyss.co.ke/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Start selling",
        item: "https://blyss.co.ke/start",
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <StartLanding
        productCategories={productCategories}
        creatorCategories={creatorCategories}
        stats={stats}
      />
    </>
  );
}

interface StartStats {
  creators: number;
  products: number;
  total_paid_out: number;
  total_earned: number;
  total_paid_out_currency: string;
  settlements_count: number;
}

async function fetchMarketplaceStats(): Promise<StartStats | null> {
  try {
    const result = (await (
      api as unknown as {
        GET: (
          path: string,
          init: { params: { query: Record<string, unknown> } },
        ) => Promise<{ data?: StartStats; error?: unknown }>;
      }
    ).GET("/v1/marketplace/stats", { params: { query: {} } })) as {
      data?: StartStats;
      error?: unknown;
    };
    return result?.data ?? null;
  } catch (error) {
    console.error("start: failed to fetch marketplace stats", error);
    return null;
  }
}
