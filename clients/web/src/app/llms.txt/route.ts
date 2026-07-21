const content = `# Blyss

> Blyss is a digital products marketplace for independent creators, based in Nairobi, Kenya.

Canonical site: https://blyss.co.ke/

## What buyers can do

Buy templates, ebooks, beats, presets, courses, photography, software, design assets, video, and writing. Kenyan buyers can pay with M-Pesa. Card payments use Visa or Mastercard. Digital purchases are delivered after payment.

## What creators can do

Creators can open a storefront, sell one-time digital products or subscriptions, set KES and USD prices, and receive payouts through supported Blyss payment methods.

## Main public pages

- Marketplace: https://blyss.co.ke/marketplace
- Sell digital products in Kenya: https://blyss.co.ke/start
- Product categories: https://blyss.co.ke/categories
- Creator directory: https://blyss.co.ke/creators
- Help: https://blyss.co.ke/help
- About Blyss: https://blyss.co.ke/about

## Current catalogue

Use https://blyss.co.ke/sitemap.xml for current product, creator, and category URLs. Product availability and prices can change. Cite the individual product or creator page rather than this file for current details.
`;

export const revalidate = 86400;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
