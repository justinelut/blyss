import { permanentRedirect } from 'next/navigation'

/**
 * /category — redirect to /marketplace.
 *
 * The marketplace page is where category browsing lives (the "Pick your lane."
 * BrowseByCraft tiles + the category filter rail). There's no separate
 * category index — clicking through a tile goes to /marketplace?category=<slug>.
 * This route exists so the bare /category link in the footer (and any old
 * external links) resolves cleanly instead of 404'ing.
 */
export default function Page() {
  permanentRedirect('/marketplace')
}
