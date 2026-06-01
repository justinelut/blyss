/**
 * Seed data for the marketplace surfaces.
 *
 * Used as fallback content when the Polar API is unavailable or empty so the
 * landing page never feels barren during launch / dev. Once real creators
 * publish products, these are automatically replaced by live data.
 *
 * IMPORTANT: per plan §3.4 ("Real product photos uploaded by creators. Blyss
 * does not commission stock"), seed data carries NO image URLs. Cards render
 * an editorial typographic placeholder — eyebrow + title + price on a tonal
 * block — until creators upload real media. This also prevents broken-image
 * icons from dead third-party photo IDs leaking into the live surface.
 */

import { schemas } from '@/lib/api'

type Product = schemas['Product']
type Organization = schemas['Organization']

/** Build a minimal Product-shaped object that satisfies the card components. */
const buildProduct = (
  name: string,
  description: string,
  priceKES: number,
  org: { name: string; slug: string; avatar_url?: string | null },
  seedKey: string,
  isRecurring = false,
): Product =>
  ({
    id: `seed_${seedKey}`,
    name,
    description,
    is_recurring: isRecurring,
    is_archived: false,
    recurring_interval: isRecurring ? 'month' : null,
    medias: [],
    prices: [
      {
        price_amount: priceKES * 100,
        price_currency: 'KES',
        amount_type: 'fixed',
      },
    ],
    organization: org,
    benefits: [],
  }) as unknown as Product

const creators = {
  amani: {
    id: 'seed_creator_amani',
    name: 'Amani Studio',
    slug: 'amani-studio',
    avatar_url: null,
  },
  njabu: {
    id: 'seed_creator_njabu',
    name: 'Njabu Records',
    slug: 'njabu-records',
    avatar_url: null,
  },
  karibu: {
    id: 'seed_creator_karibu',
    name: 'Karibu Type',
    slug: 'karibu-type',
    avatar_url: null,
  },
  zawadi: {
    id: 'seed_creator_zawadi',
    name: 'Zawadi Press',
    slug: 'zawadi-press',
    avatar_url: null,
  },
}

export const SEED_PRODUCTS: Product[] = [
  buildProduct(
    'Notion OS for Freelancers',
    'A 14-page Notion workspace built for Kenyan freelancers — invoices, client tracker, project pipeline.',
    2400,
    creators.amani,
    'notion-os',
  ),
  buildProduct(
    'Lagos Drum Kit Vol. 1',
    '24 hand-mixed drums sampled across Nairobi, Lagos, Accra. Royalty-free.',
    1800,
    creators.njabu,
    'lagos-drum-kit',
  ),
  buildProduct(
    'Kenyan Type Specimen',
    'A typeface family designed for African literature. 4 weights, 80+ glyphs.',
    3200,
    creators.karibu,
    'kenyan-type',
  ),
  buildProduct(
    'M-Pesa for Developers',
    'A 6-hour course on the Daraja API. Includes code, sandbox keys, certified e-cert.',
    4500,
    creators.amani,
    'mpesa-course',
  ),
  buildProduct(
    'Nairobi Lightroom Presets',
    '12 presets tuned for Kenyan light. Golden-hour Mt Kenya, blue-hour Kilimani, harsh midday.',
    1500,
    creators.amani,
    'lightroom-presets',
  ),
  buildProduct(
    'Brand Kit Template',
    'A Figma + Adobe brand-system template — logo grid, color tokens, type scale.',
    2800,
    creators.karibu,
    'brand-kit',
  ),
  buildProduct(
    'Swahili Storybook Vol. 1',
    "A 64-page illustrated children's storybook in Swahili and English. PDF + EPUB.",
    1200,
    creators.zawadi,
    'swahili-storybook',
  ),
  buildProduct(
    'Afro House Sample Pack',
    '120 loops + one-shots across log drums, marimbas, polyrhythmic vocals. WAV + MIDI.',
    2200,
    creators.njabu,
    'afro-house',
  ),
]

export const SEED_SUBSCRIPTIONS = SEED_PRODUCTS.slice(0, 3).map((p, i) =>
  buildProduct(
    ['Studio Patrons', 'Beats Insider', 'Type Foundry'][i] || p.name,
    'Monthly access to drops, behind-the-scenes, member discord.',
    [800, 1200, 1500][i] || 1000,
    Object.values(creators)[i] || creators.amani,
    p.id.replace('seed_', '') + '-sub',
    true,
  ),
)

export const SEED_CREATORS: Organization[] = Object.values(creators).map(
  (c) =>
    ({
      ...c,
      bio: 'Kenyan creator on Blyss.',
      profile_settings: {
        cover_image_url: null,
      },
    }) as unknown as Organization,
)

export const SEED_CATEGORIES = [
  { id: 'cat_templates', name: 'Templates', slug: 'templates', cover_image_url: null, product_count: 24 },
  { id: 'cat_beats', name: 'Beats & Samples', slug: 'beats', cover_image_url: null, product_count: 18 },
  { id: 'cat_courses', name: 'Courses', slug: 'courses', cover_image_url: null, product_count: 12 },
  { id: 'cat_ebooks', name: 'Ebooks', slug: 'ebooks', cover_image_url: null, product_count: 22 },
  { id: 'cat_presets', name: 'Photo Presets', slug: 'presets', cover_image_url: null, product_count: 9 },
  { id: 'cat_fonts', name: 'Fonts', slug: 'fonts', cover_image_url: null, product_count: 7 },
]
