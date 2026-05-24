/**
 * JsonLd — server component that renders schema.org structured data.
 *
 * Used across product, creator, category, home pages for SEO. Plan §8.3.
 *
 *   <JsonLd
 *     data={{
 *       '@context': 'https://schema.org',
 *       '@type': 'Product',
 *       name: product.name,
 *       offers: { '@type': 'Offer', price: '1200', priceCurrency: 'KES' },
 *     }}
 *   />
 *
 * Multiple JsonLd blocks on a single page are fine — each emits its own
 * <script> tag and Google parses all of them.
 */
interface JsonLdProps {
  data: Record<string, unknown>
}

export const JsonLd = ({ data }: JsonLdProps) => {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0).replace(/</g, '\\u003c'),
      }}
    />
  )
}
