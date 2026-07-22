import { Metadata } from "next";
import { getServerSideAPI } from "@/utils/client/serverside";
import { unwrap } from "@/lib/api";
import { JsonLd } from "@/design";
import { CreatorsDirectoryPage } from "@/components/Marketplace/CreatorsDirectoryPage";
import { CreatorsPageHeader } from "@/components/Marketplace/CreatorsPageHeader";

// ISR — regenerate the directory at most once per minute.
export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kenyan creators selling digital products",
  description:
    "Browse independent creators selling digital products on Blyss. Kenyan and global designers, writers, musicians, photographers, course teachers, and developers.",
  keywords:
    "kenyan creators, kenyan designers, kenyan musicians, kenyan ebook authors, kenyan course creators, independent creators africa, kenyan music producers, top kenyan creators",
  alternates: { canonical: "https://blyss.co.ke/creators" },
  openGraph: {
    title: "Creators · Kenyan + global makers on Blyss",
    description:
      "Independent creators selling templates, ebooks, beats, presets, courses. Kenyan + global.",
    siteName: "Blyss",
    type: "website",
    locale: "en_KE",
    images: [
      {
        url: "https://cdn.blyss.co.ke/brand/og-default.png",
        width: 1200,
        height: 630,
        alt: "Blyss creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creators on Blyss",
    description:
      "Kenyan + global designers, writers, musicians, photographers, course teachers.",
    images: ["https://cdn.blyss.co.ke/brand/og-default.png"],
  },
  robots: { index: true, follow: true },
};

export default async function CreatorsPage() {
  const api = await getServerSideAPI();

  // Fetch the public directory data concurrently. Categories are handed to
  // the client boundary even when empty so hydration never repeats this work.
  const [creatorsResp, stats, creatorCategories] = await Promise.all([
    unwrap(
      api.GET("/v1/organizations/public", {
        params: { query: { limit: 100 } as any },
      }),
    ).catch(() => ({ items: [] as any[] })),
    fetchMarketplaceStats(api),
    unwrap((api as any).GET("/v1/creator-categories/")).catch(
      () => [] as any[],
    ),
  ]);

  const creators = (creatorsResp.items ?? []) as any[];

  // Spotlight: prefer a creator flagged is_featured_spotlight; fallback to
  // the first featured creator if no spotlight flag exists yet.
  const spotlight =
    creators.find((c) => c.is_featured_spotlight === true) ??
    creators.find((c) => c.is_featured === true) ??
    null;

  // Try to fetch the spotlight creator's top product (best-selling proxy =
  // first public product). Non-fatal if unavailable.
  let spotlightTopProduct = null;
  if (spotlight?.id) {
    try {
      const productsResp = await unwrap(
        api.GET("/v1/products/public", {
          params: {
            query: {
              organization_id: spotlight.id,
              limit: 1,
            } as any,
          },
        }),
      );
      spotlightTopProduct = productsResp.items?.[0] ?? null;
    } catch {
      spotlightTopProduct = null;
    }
  }

  return (
    <>
      <JsonLd
        data={{
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
              name: "Creators",
              item: "https://blyss.co.ke/creators",
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Independent Creators",
          url: "https://blyss.co.ke/creators",
          description:
            "Meet creators making things worth supporting. Designers, writers, musicians, educators, photographers.",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: creators.length,
            itemListElement: creators.slice(0, 24).map((c: any, i: number) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://blyss.co.ke/creators/${c.slug ?? c.id}`,
              name: c.name,
            })),
          },
        }}
      />
      <CreatorsPageHeader />
      <CreatorsDirectoryPage
        initialCreators={creators}
        featuredSpotlight={spotlight}
        spotlightTopProduct={spotlightTopProduct}
        stats={stats}
        initialCategories={creatorCategories}
      />
    </>
  );
}

interface MarketplaceStats {
  creators: number;
  products: number;
  total_paid_out: number;
  total_earned: number;
  total_paid_out_currency: string;
  settlements_count: number;
}

async function fetchMarketplaceStats(
  api: Awaited<ReturnType<typeof getServerSideAPI>>,
): Promise<MarketplaceStats | null> {
  try {
    const result = (await (
      api as unknown as {
        GET: (
          path: string,
          init: { params: { query: Record<string, unknown> } },
        ) => Promise<{ data?: MarketplaceStats; error?: unknown }>;
      }
    ).GET("/v1/marketplace/stats", { params: { query: {} } })) as {
      data?: MarketplaceStats;
      error?: unknown;
    };
    return result?.data ?? null;
  } catch (error) {
    console.error("creators: failed to fetch marketplace stats", error);
    return null;
  }
}
