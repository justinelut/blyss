/* Hallmark · genre: editorial · macrostructure: Ecosystem Index
 * theme: Blyss light · enrichment: real marketplace media · nav: inherited
 * footer: Ft1 mast-headed
 *
 * Structure: search-led opening · returning-buyer continuity · category index
 * · featured catalogue · new arrivals · people · recurring access · buying help.
 */
import { schemas } from "@/lib/api";
import { JsonLd } from "@/design";
import { Hero } from "@/components/Marketplace/Hero";
import { ContinueShopping } from "@/components/Marketplace/ContinueShopping";
import { TrendingProducts } from "@/components/Marketplace/TrendingProducts";
import {
  BrowseByCraft,
  type CategoryTile,
} from "@/components/Marketplace/BrowseByCraft";
import { FeaturedCreators } from "@/components/Marketplace/FeaturedCreators";
import { FeaturedSubscriptions } from "@/components/Marketplace/FeaturedSubscriptions";
import { HowItWorks } from "@/components/Marketplace/HowItWorks";
import { ClosingCtaBand } from "@/components/Marketplace/ClosingCtaBand";

interface HomePageProps {
  featuredProducts: schemas["Product"][];
  newestProducts: schemas["Product"][];
  featuredSubscriptions: schemas["Product"][];
  trendingCreators: schemas["Organization"][];
  categories: CategoryTile[];
  country: string;
  currency: string;
}

export default function HomePage({
  featuredProducts,
  newestProducts,
  featuredSubscriptions,
  trendingCreators,
  categories,
  country,
  currency,
}: HomePageProps) {
  const products = featuredProducts ?? [];
  const newest = newestProducts ?? [];
  const subscriptions = featuredSubscriptions ?? [];
  const creators = trendingCreators ?? [];
  const categoryRows = categories ?? [];

  // The opening uses one product only. It is removed from every rail below so
  // the first screen never repeats immediately in the catalogue.
  const featuredProduct =
    products.find((product) => product.medias?.[0]?.public_url) ?? products[0];
  const featuredRail = products.filter(
    (product) => product.id !== featuredProduct?.id,
  );
  const usedProductIds = new Set(products.map((product) => product.id));
  const newArrivals = newest.filter(
    (product) => !usedProductIds.has(product.id) && !product.is_recurring,
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Blyss",
          url: "https://blyss.co.ke",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://blyss.co.ke/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Blyss",
          url: "https://blyss.co.ke",
          logo: "https://cdn.blyss.co.ke/brand/og-default.png",
          description:
            "A marketplace for digital products from independent creators. Browse templates, ebooks, beats, courses, and subscriptions.",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Nairobi",
            addressCountry: "KE",
          },
          sameAs: [
            "https://instagram.com/blyss.co.ke",
            "https://x.com/blyss_co_ke",
          ],
        }}
      />

      <Hero
        featuredProduct={featuredProduct}
        country={country}
        currency={currency}
      />
      <ContinueShopping />
      {categoryRows.length > 0 && <BrowseByCraft categories={categoryRows} />}
      {featuredRail.length > 0 && (
        <TrendingProducts
          products={featuredRail}
          heading="Featured products"
          description="A changing selection from shops across Blyss."
          viewAllHref="/marketplace"
        />
      )}
      {newArrivals.length > 0 && (
        <TrendingProducts
          products={newArrivals}
          heading="New arrivals"
          description="Recently published products from independent creators."
          viewAllHref="/marketplace?sort=newest"
          tone="elevated"
        />
      )}
      {creators.length > 0 && <FeaturedCreators creators={creators} />}
      {subscriptions.length > 0 && (
        <FeaturedSubscriptions subscriptions={subscriptions} />
      )}
      <HowItWorks />
      <ClosingCtaBand />
    </>
  );
}
