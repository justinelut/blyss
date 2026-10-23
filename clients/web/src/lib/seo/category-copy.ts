/** Metadata for live category listings; product details stay on each listing. */
export function getCategoryTitle(name: string): string {
  return `Browse ${name}`;
}

export function getCategoryDescription(name: string): string {
  return `Browse current ${name.toLowerCase()} listings from independent creators. Product details, prices, delivery terms, and available checkout methods vary by listing and region.`;
}
