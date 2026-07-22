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
    "Make money selling templates, ebooks, beats, presets, or courses to buyers across Kenya. M-Pesa or bank payouts within 24 hours. No setup fee, no monthly subscription.",
  keywords:
    "sell digital products kenya, side hustle kenya 2026, make money online kenya, passive income kenya, sell ebook kenya, sell ebooks kenya, sell beats kenya, sell presets kenya, kenya creator economy, mpesa creator payouts, kenya online business, become a creator kenya, blyss storefront",
  alternates: { canonical: "https://blyss.co.ke/start" },
  openGraph: {
    title: "Sell digital products in Kenya · Start selling on Blyss",
    description:
      "Sell templates, ebooks, beats, presets, or courses. M-Pesa or bank payouts within 24 hours. No setup fee.",
    type: "website",
    locale: "en_KE",
    url: "https://blyss.co.ke/start",
    images: [
      {
        url: "https://cdn.blyss.co.ke/brand/og-default.png",
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
      "Templates, ebooks, beats, presets, courses. M-Pesa or bank within 24 hours.",
    images: ["https://cdn.blyss.co.ke/brand/og-default.png"],
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

  // FAQPage JSON-LD — answers the questions creators search before
  // signing up. Rich-snippet eligibility on Google + cited verbatim by
  // Perplexity / ChatGPT Search / Claude Search when asked "how to
  // sell digital products in Kenya". Wording matches the
  // anti-slop-writing skill (concrete numbers, named rails, no
  // 'seamless'/'powerful'/'discover').
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I sell digital products in Kenya with M-Pesa?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Blyss accepts M-Pesa, Visa, and Mastercard at checkout. Creators receive payouts to their M-Pesa or bank account within 24 hours of a sale.",
        },
      },
      {
        "@type": "Question",
        name: "What digital products can I sell on Blyss?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Templates (Notion, Canva, Figma, resume), ebooks and PDFs, beats and music, Lightroom presets, online courses, photography, fonts, software, and stock assets. Creators upload the file and Blyss handles checkout, delivery, and refunds.",
        },
      },
      {
        "@type": "Question",
        name: "How much does Blyss charge?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "There is no setup fee and no monthly subscription. Blyss takes a small platform fee per sale; you keep the rest. M-Pesa and card processing fees are also deducted before payout, as on every other Kenyan payment platform.",
        },
      },
      {
        "@type": "Question",
        name: "How fast do creators get paid on Blyss?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Within 24 hours of a confirmed sale. Funds settle to your linked Paystack subaccount and are released to your M-Pesa number or bank account daily.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to be in Nairobi to sell on Blyss?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Creators anywhere in Kenya can sell on Blyss. You only need an M-Pesa number or a Kenyan bank account to receive payouts, and a national ID for KYC.",
        },
      },
      {
        "@type": "Question",
        name: "Can buyers outside Kenya purchase my products?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Buyers anywhere can pay with Visa or Mastercard. If you set a price in USD as well as KES, your products show up to international buyers in their currency.",
        },
      },
      {
        "@type": "Question",
        name: "How long does setup take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most creators publish their first product in under 10 minutes after signing up. You will need your name, M-Pesa number (or bank account), national ID, and the file you are selling.",
        },
      },
      {
        "@type": "Question",
        name: "Is Blyss a Gumroad or Selar alternative?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Blyss is built for Kenyan creators specifically. Unlike Gumroad and Selar, Blyss accepts M-Pesa at checkout, pays out in KES within 24 hours, and is regulated under Kenyan tax rules. Both global tools still work — Blyss adds the local payment rail and faster payouts.",
        },
      },
    ],
  };

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
      <JsonLd data={faqLd} />
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
