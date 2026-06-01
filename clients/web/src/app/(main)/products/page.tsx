import { permanentRedirect } from 'next/navigation'

/**
 * /products is the legacy browse route. The canonical, redesigned browse
 * experience lives at /marketplace (see plan §6.2, Lighthouse config, and the
 * marketplace nav). We permanently redirect so the old Polar-styled page is no
 * longer part of the live surface. The legacy component files are left on disk
 * (no file/dependency removal) but are no longer reachable.
 */
export default function Page() {
  permanentRedirect('/marketplace')
}
