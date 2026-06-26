/**
 * Per-category SEO copy.
 *
 * Each entry holds the title, description, intro paragraphs, and a
 * short bullet list for one category. Slugs match the backend
 * `product_categories.slug` column. Categories without an entry here
 * fall back to the database `description` field (creator-edited in
 * the backoffice).
 *
 * Anti-slop discipline:
 *   - No "discover", "seamless", "powerful", "modern", "transform"
 *   - Concrete: name product types, file formats, payment rails,
 *     creators ("Kenyan + global"), payout speed ("24 hours")
 *   - Body copy under 400 words per category — long enough to give
 *     Google something to rank, short enough that buyers actually read
 *
 * Keyword targets are drawn from the 2026-06-26 autocomplete
 * research in `plan/seo-research-2026-06-26.md`. Each category
 * targets its strongest long-tail query plus 4–6 related
 * autocomplete tails.
 */

export interface CategoryIntro {
  eyebrow: string
  heading: string
  title: string
  description: string
  keywords: string
  paragraphs: string[]
  bulletHeading?: string
  bullets?: string[]
}

const INTROS: Record<string, CategoryIntro> = {
  // ──────────────────────────────────────────────────────────────
  // Notion templates — global high-volume + Kenyan creator-side
  // ──────────────────────────────────────────────────────────────
  'notion-templates': {
    eyebrow: 'Notion templates',
    heading: 'Notion templates for productivity, students, ADHD, work.',
    title:
      'Buy Notion templates · Productivity, students, ADHD, work · Blyss',
    description:
      'Buy Notion templates from creators. Productivity, students, ADHD, work, freelancer, project management, planner. Pay with M-Pesa, Visa, or Mastercard. Instant download.',
    keywords:
      'buy notion templates, notion templates for students, notion templates for productivity, notion templates adhd, notion templates work, notion templates freelancer, notion templates project management, notion planner, kenyan notion creators',
    paragraphs: [
      'Templates duplicate into your workspace in one click. After checkout you get a Notion duplication link and a PDF cheat sheet covering every page, database, and view inside the template.',
      'Most templates on Blyss are built and maintained by independent creators — including a growing roster of Kenyan and Pan-African creators who price in KES. Buyers in Kenya pay with M-Pesa; buyers anywhere pay with Visa or Mastercard.',
      'No subscription. Each template is a one-time purchase. Updates the creator publishes after you buy are included for life unless the listing says otherwise.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Productivity systems (second brain, GTD, PARA, time-blocking)',
      'Student planners (semester, thesis, university tracker)',
      'ADHD-friendly Notion setups (low-friction, fewer databases)',
      'Freelancer / consultant dashboards (clients, invoices, deliverables)',
      'Project management templates (sprints, OKRs, roadmap)',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Lightroom presets — high commercial intent, wedding subniche
  // ──────────────────────────────────────────────────────────────
  'lightroom-presets': {
    eyebrow: 'Lightroom presets',
    heading: 'Lightroom presets — wedding, portrait, film, mobile.',
    title:
      'Buy Lightroom presets · Wedding, portrait, film, mobile · Blyss',
    description:
      'Buy Lightroom presets from creators. Wedding, portrait, film, mobile, outdoor, family. Desktop XMP + mobile DNG. Pay with M-Pesa, Visa, or Mastercard. Instant download.',
    keywords:
      'buy lightroom presets, wedding lightroom presets, lightroom presets for portraits, lightroom presets film, lightroom presets for mobile, outdoor portrait presets, dng presets, kenyan photographer presets',
    paragraphs: [
      'Presets deliver as a single .zip with both desktop XMP files and mobile DNG files unless the listing specifies otherwise. After checkout the download arrives on screen and in your email.',
      'Most Lightroom presets on Blyss are sold direct by the photographer who made them — not resold from a stock library. That means you can message the creator before buying if you want a sample edit on one of your own RAWs.',
      'Each preset is licensed for personal and commercial use by the buyer. Reselling or repackaging is not allowed unless the creator grants an extended licence.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Wedding presets (warm, airy, dark and moody)',
      'Portrait presets (skin-tone safe, studio, natural light)',
      'Film emulation (Kodak Portra, Fuji 400H, Ektar)',
      'Mobile-only DNG packs',
      'Outdoor + travel presets',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Ebooks — Kenyan + global authors
  // ──────────────────────────────────────────────────────────────
  ebooks: {
    eyebrow: 'Ebooks',
    heading: 'Ebooks by Kenyan and global authors.',
    title:
      'Buy ebooks online · Kenyan + global authors · Blyss',
    description:
      'Buy ebooks from independent authors. Fiction, business, personal finance, self-help, technical. PDF + EPUB. Pay with M-Pesa, Visa, or Mastercard. Instant download.',
    keywords:
      'buy ebooks, buy ebooks kenya, kenyan author ebooks, sell ebook online, ebooks for kindle, business ebooks, personal finance ebooks, self-help ebooks, technical ebooks, instant download',
    paragraphs: [
      'Each ebook on Blyss is sold direct by the author. No publisher cut. Authors keep more of the cover price than they would on Amazon Kindle or Google Play Books.',
      'Files deliver as PDF and EPUB unless the listing notes otherwise. Both formats open on Kindle, Apple Books, Google Play Books, Kobo, and every modern reader app. PDFs are unlocked — no DRM — so you can sync them across devices freely.',
      'Buyers in Kenya pay with M-Pesa at checkout. International buyers pay with Visa or Mastercard. Authors receive payouts within 24 hours.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Personal finance + investing (Kenyan + global)',
      'Business and entrepreneurship',
      'Self-help, productivity, habits',
      'Technical (programming, AI, design)',
      'Fiction and creative writing',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Beats — exclusive vs lease, Kenyan producers
  // ──────────────────────────────────────────────────────────────
  beats: {
    eyebrow: 'Beats and instrumentals',
    heading: 'Beats and instrumentals from independent producers.',
    title:
      'Buy beats online · Lease and exclusive rights · Blyss',
    description:
      'Buy beats and instrumentals from independent producers. Lease, exclusive, and stems. Hip-hop, afrobeats, gengetone, R&B, trap. WAV + MP3. Instant download after payment.',
    keywords:
      'buy beats online, buy beats exclusive rights, kenyan music producers, afrobeats instrumentals, gengetone beats, hip hop beats, trap instrumentals, lease beats, royalty free beats',
    paragraphs: [
      'Beats on Blyss are sold by the producer. Each listing tells you exactly what you get: leased (non-exclusive), exclusive, or stems-included. Lease deals let multiple artists license the same beat at a lower price; exclusive deals pull the beat off the marketplace after purchase.',
      'Files deliver as a .zip with the WAV and MP3 unless the listing offers stems as a separate tier. After payment the download starts immediately and a copy lands in your inbox.',
      'Kenyan producers can sell to Kenyan rappers and singers in KES. Producers anywhere can also list in USD to reach buyers in the US, UK, Nigeria, and South Africa.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Afrobeats and amapiano',
      'Gengetone and Kenyan hip-hop',
      'Trap, drill, boom-bap',
      'R&B + soul instrumentals',
      'Stems and trackouts',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Courses — Kenyan + global
  // ──────────────────────────────────────────────────────────────
  courses: {
    eyebrow: 'Online courses',
    heading: 'Self-paced online courses from creators.',
    title:
      'Buy online courses · Self-paced, instant access · Blyss',
    description:
      'Buy online courses from independent creators. Business, design, marketing, coding, finance, photography. Self-paced video lessons with lifetime access. Pay with M-Pesa or card.',
    keywords:
      'buy online courses, online courses kenya, self-paced online courses, business courses, design courses, marketing courses, coding bootcamp, photography courses, lifetime access',
    paragraphs: [
      'Courses on Blyss are self-paced. After checkout you get lifetime access to every lesson, downloadable resource, and update the creator publishes. No expiring access, no monthly subscription.',
      'Courses are sold directly by the creator who built them. Many Kenyan creators on Blyss teach skills that translate to local freelance markets — Notion consulting, Lightroom retouching, basic web development, M-Pesa-aware Shopify setup, voiceover work, and more.',
      'You watch the lessons in any modern browser or on the Blyss mobile site. Course assets and PDFs are downloadable.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Business and freelancing (Kenya-aware)',
      'Design (Figma, Photoshop, Lightroom)',
      'Marketing and social media',
      'Coding, AI, and prompt engineering',
      'Photography and videography',
      'Personal finance and investing',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Canva templates / social media
  // ──────────────────────────────────────────────────────────────
  'canva-templates': {
    eyebrow: 'Canva templates',
    heading: 'Canva templates for Instagram, social media, and brands.',
    title:
      'Buy Canva templates · Instagram, social media, brands · Blyss',
    description:
      'Buy Canva templates from creators. Instagram posts, stories, carousels, brand kits, lead magnets, pitch decks. Editable in Canva free or pro. Instant download.',
    keywords:
      'buy canva templates, instagram template canva, social media templates, canva templates etsy, instagram carousel template, instagram story template canva, canva brand kit, pitch deck canva',
    paragraphs: [
      'Each Canva template ships as a duplication link. Open the link in your Canva account, duplicate the design into your workspace, and edit. Most templates work in Canva Free; a few use Pro elements (fonts, frames) and say so in the listing.',
      'Templates on Blyss are sold direct by the designer. No reseller markup. You see who made it, when they made it, and what other templates they have in the same brand world.',
      'Licensing is single-end-use unless the creator offers extended use as a separate tier — meaning you can use the template across your own social and marketing forever, but you cannot resell the template itself.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Instagram post + story + carousel packs',
      'TikTok hooks and cover templates',
      'Brand kit + style guide',
      'Lead magnet + opt-in templates',
      'Pitch deck and proposal templates',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Fonts (commercial use is the key keyword)
  // ──────────────────────────────────────────────────────────────
  fonts: {
    eyebrow: 'Fonts',
    heading: 'Fonts licensed for personal and commercial use.',
    title:
      'Buy fonts for commercial use · Blyss type marketplace',
    description:
      'Buy fonts from independent type designers. Commercial-use licence included. Display, text, script, mono, variable. OTF + TTF + WOFF2. Instant download.',
    keywords:
      'buy fonts, fonts for commercial use, premium fonts, display fonts, script fonts, sans serif fonts, variable fonts, otf ttf woff2, type design',
    paragraphs: [
      'Every font on Blyss is sold by the type designer who drew it. Each listing states what the licence covers: number of installs, web use, embedding, and whether you can use it in a product you sell.',
      'Files deliver as a .zip containing OTF, TTF, and WOFF2 (web font) unless the listing offers more (extended Latin, variable axes, italics). Updates the foundry publishes are free for buyers.',
      'For agency or large-team use, many type designers offer an extended licence as a separate tier on the listing.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Display and headline faces',
      'Text and body faces',
      'Script and handwritten',
      'Sans serif and grotesque',
      'Mono and code fonts',
      'Variable fonts',
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Stock music / royalty-free music
  // ──────────────────────────────────────────────────────────────
  'stock-music': {
    eyebrow: 'Stock music',
    heading: 'Royalty-free music for video, podcast, and ads.',
    title:
      'Buy royalty-free music · Commercial use · Blyss',
    description:
      'Buy royalty-free music from independent composers. YouTube-safe, commercial use, podcast intros, ad spots. Hip-hop, lofi, cinematic, ambient. WAV + MP3. Instant download.',
    keywords:
      'buy royalty free music, royalty free music for youtube, podcast intro music, ad music commercial use, lofi music license, cinematic music license, stock music for video',
    paragraphs: [
      'Royalty-free music on Blyss is licensed for use in a single project — your YouTube video, podcast, ad spot, or short film — at the price on the listing. Each licence covers one production unless the creator offers a multi-use tier.',
      'Files deliver as a .zip containing both WAV (broadcast) and MP3 (preview) unless stems are offered separately. After payment, the licence certificate lands in your email.',
      'For agency, brand, or franchise use, several composers on Blyss offer extended licences priced per channel.',
    ],
    bulletHeading: 'Popular subcategories',
    bullets: [
      'Lo-fi and chill background music',
      'Cinematic and trailer music',
      'Podcast intros and outros',
      'Ad spot music (30s, 60s)',
      'Ambient and meditation',
    ],
  },
}

/**
 * Look up the curated SEO intro for a category slug.
 *
 * Returns `null` for categories without curated copy — the page
 * then falls back to the backoffice-edited description and a
 * default title pattern.
 */
export function getCategoryIntro(slug: string): CategoryIntro | null {
  return INTROS[slug] ?? null
}

export const CATEGORY_INTRO_SLUGS = Object.keys(INTROS)
