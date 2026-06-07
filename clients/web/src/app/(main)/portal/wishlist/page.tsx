import { redirect } from 'next/navigation'

export default function Page() {
  // Marketplace wishlist already lives at /wishlist (top-level);
  // /portal/wishlist redirects there to keep the in-portal nav link
  // working without duplicating the page.
  redirect('/wishlist')
}
