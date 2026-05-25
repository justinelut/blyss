/**
 * Seed data for the marketplace surfaces.
 *
 * Used as fallback content when the Polar API is unavailable or empty so the
 * landing page never feels barren during launch / dev. Once real creators
 * publish products, these are automatically replaced by live data.
 *
 * Editorial copy is Kenyan-creator-economy authentic — references real
 * categories Kenyan creators sell (templates, beats, courses, presets).
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
  imageHash: string,
  isRecurring = false,
): Product =>
  ({
    id: `seed_${imageHash}`,
    name,
    description,
    is_recurring: isRecurring,
    is_archived: false,
    recurring_interval: isRecurring ? 'month' : null,
    medias: [
      {
        public_url: `https://images.unsplash.com/photo-${imageHash}?auto=format&fit=crop&w=800&q=70`,
        mime_type: 'image/jpeg',
      },
    ],
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
    avatar_url:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=70',
  },
  njabu: {
    id: 'seed_creator_njabu',
    name: 'Njabu Records',
    slug: 'njabu-records',
    avatar_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=70',
  },
  karibu: {
    id: 'seed_creator_karibu',
    name: 'Karibu Type',
    slug: 'karibu-type',
    avatar_url:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=70',
  },
  zawadi: {
    id: 'seed_creator_zawadi',
    name: 'Zawadi Press',
    slug: 'zawadi-press',
    avatar_url:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=70',
  },
}

export const SEED_PRODUCTS: Product[] = [
  buildProduct(
    'Notion OS for Freelancers',
    'A 14-page Notion workspace built for Kenyan freelancers — invoices, client tracker, project pipeline.',
    2400,
    creators.amani,
    '1499209664983-09f8c3b54e7c',
  ),
  buildProduct(
    'Lagos Drum Kit Vol. 1',
    '24 hand-mixed drums sampled across Nairobi, Lagos, Accra. Royalty-free.',
    1800,
    creators.njabu,
    '1493225457124-a3eb161ffa5f',
  ),
  buildProduct(
    'Kenyan Type Specimen',
    'A typeface family designed for African literature. 4 weights, 80+ glyphs.',
    3200,
    creators.karibu,
    '1456513080510-7bf3a84b82f8',
  ),
  buildProduct(
    'M-Pesa for Developers',
    'A 6-hour course on the Daraja API. Includes code, sandbox keys, certified e-cert.',
    4500,
    creators.amani,
    '1517694712202-14dd9538aa97',
  ),
  buildProduct(
    'Nairobi Lightroom Presets',
    '12 presets tuned for Kenyan light. Golden-hour Mt Kenya, blue-hour Kilimani, harsh midday.',
    1500,
    creators.amani,
    '1469474968028-56623f02e42e',
  ),
  buildProduct(
    'Brand Kit Template',
    'A Figma + Adobe brand-system template — logo grid, color tokens, type scale.',
    2800,
    creators.karibu,
    '1561070791-2526d30994b8',
  ),
  buildProduct(
    'Swahili Storybook Vol. 1',
    'A 64-page illustrated children\'s storybook in Swahili and English. PDF + EPUB.',
    1200,
    creators.zawadi,
    '1481627834876-b7833e8f5570',
  ),
  buildProduct(
    'Afro House Sample Pack',
    '120 loops + one-shots across log drums, marimbas, polyrhythmic vocals. WAV + MIDI.',
    2200,
    creators.njabu,
    '1514525253161-7a46d19cd819',
  ),
]

export const SEED_SUBSCRIPTIONS = SEED_PRODUCTS.slice(0, 3).map((p, i) =>
  buildProduct(
    ['Studio Patrons', 'Beats Insider', 'Type Foundry'][i] || p.name,
    'Monthly access to drops, behind-the-scenes, member discord.',
    [800, 1200, 1500][i] || 1000,
    Object.values(creators)[i] || creators.amani,
    p.id.replace('seed_', ''),
    true,
  ),
)

export const SEED_CREATORS: Organization[] = Object.values(creators).map(
  (c) =>
    ({
      ...c,
      bio: 'Kenyan creator on Blyss.',
      profile_settings: {
        cover_image_url: `https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=70`,
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
