"use client";

/* Hallmark · macrostructure: Manifesto · genre: editorial
 * theme: Blyss ink + oxblood
 * sections:
 *   1. Hero (Pick a handle. Upload. Set a price.)
 *   2. What you can sell — REAL product categories from /v1/categories
 *   3. Who's already on Blyss — REAL creator categories from /v1/creator-categories
 *   4. How payouts work — M-Pesa / bank, visible payout status
 *   5. What it costs — 20% platform fee, no subscription, no listing fees
 *   6. What happens after you sign up — handle / KYC / review / live
 *   7. What you need before you start — checklist
 *   8. FAQ — concrete answers to the questions that actually block signup
 *   9. Closing CTA
 *
 * The structure is reassurance-first. We assume the visitor is
 * curious-but-skeptical: they want to know who pays, who sees the
 * money, what cut Blyss takes, and what happens if a buyer asks for
 * a refund. Every section answers one of those questions in plain
 * language.
 */

import { motion } from "motion/react";
import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { Eyebrow, typography } from "@/design";
import { cn } from "@/lib/utils";
import { StartHeader } from "@/components/Start/StartHeader";
import { StartFooter } from "@/components/Start/StartFooter";
import {
  StartStatsStrip,
  type StartStats,
} from "@/components/Start/StartStatsStrip";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
}

export interface CreatorCategory {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  productCategories: ProductCategory[];
  creatorCategories: CreatorCategory[];
  stats?: StartStats | null;
}

/** Fallback short list used when the categories endpoint returns
 *  nothing (boot, network blip, or fresh install). Keeps the page
 *  from rendering an empty section. */
const FALLBACK_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "f-templates",
    name: "Templates",
    slug: "templates",
    description: "Notion, Figma, Airtable workspaces",
    product_count: 0,
  },
  {
    id: "f-ebooks",
    name: "Ebooks",
    slug: "ebooks",
    description: "PDFs, EPUBs, illustrated stories",
    product_count: 0,
  },
  {
    id: "f-beats",
    name: "Beats and music",
    slug: "beats-music",
    description: "Drum kits, loops, vocal chops",
    product_count: 0,
  },
  {
    id: "f-presets",
    name: "Presets",
    slug: "presets",
    description: "Lightroom, Capture One, LUTs",
    product_count: 0,
  },
  {
    id: "f-courses",
    name: "Courses",
    slug: "courses",
    description: "Self-paced lessons + certificates",
    product_count: 0,
  },
  {
    id: "f-photography",
    name: "Photography",
    slug: "photography",
    description: "Stock packs, print-ready files",
    product_count: 0,
  },
];

const FALLBACK_CREATOR_CATEGORIES: CreatorCategory[] = [
  { id: "fc-designers", name: "Designers", slug: "designers" },
  { id: "fc-musicians", name: "Musicians", slug: "musicians" },
  { id: "fc-writers", name: "Writers", slug: "writers" },
  { id: "fc-photographers", name: "Photographers", slug: "photographers" },
  { id: "fc-educators", name: "Educators", slug: "educators" },
  { id: "fc-developers", name: "Developers", slug: "developers" },
];

export const StartLanding = ({
  productCategories,
  creatorCategories,
  stats = null,
}: Props) => {
  const ease = [0.32, 0.72, 0, 1] as const;

  const products =
    productCategories.length > 0
      ? productCategories
      : FALLBACK_PRODUCT_CATEGORIES;
  const creators =
    creatorCategories.length > 0
      ? creatorCategories
      : FALLBACK_CREATOR_CATEGORIES;

  const fadeUp = (_delay: number) => ({
    initial: false as const,
    animate: { opacity: 1, y: 0 },
  });

  const inViewProps = {
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-15%" },
    transition: { duration: 0.6, ease },
  } as const;

  return (
    <div className="bg-[var(--background)] text-[var(--text-primary)]">
      <StartHeader />
      {/* 1 — Hero */}
      <section className="mx-auto max-w-[1280px] px-6 pt-24 pb-16 md:px-16 md:pt-40 md:pb-24">
        <motion.div {...fadeUp(0)}>
          <Eyebrow accent>Built for Kenyan creators</Eyebrow>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="mt-6 max-w-[18ch] font-display font-semibold tracking-[-0.025em] leading-[0.98] text-[clamp(48px,7vw,96px)]"
        >
          Make. Sell.{" "}
          <em className="not-italic text-[var(--accent)]">Get paid.</em>
        </motion.h1>

        <motion.p
          {...fadeUp(0.25)}
          className="mt-8 max-w-[56ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)] md:text-[22px]"
        >
          Open a shop for your ebooks, templates, beats, presets, courses, and
          subscriptions. Buyers use the payment methods shown at checkout; you
          connect M-Pesa or a Kenyan bank account for payouts.
        </motion.p>

        <motion.div
          {...fadeUp(0.4)}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/dashboard/create"
            className="group inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 py-4 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] hover:gap-3"
          >
            Create your shop
            <FiArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-13 items-center justify-center px-2 py-4 font-sans text-[15px] font-medium text-[var(--text-primary)] underline-offset-8 transition-colors hover:text-[var(--accent)] hover:underline"
          >
            See what others are selling
          </Link>
        </motion.div>

        <motion.p
          {...fadeUp(0.55)}
          className="mt-6 max-w-[56ch] font-sans text-[13px] text-[var(--text-muted)]"
        >
          Free to set up. No monthly subscription or listing fee. Blyss keeps
          20% when you make a sale.
        </motion.p>
      </section>

      {/* Stats strip — real numbers from /v1/marketplace/stats. Renders
          immediately after the hero so a creator-prospect's first
          confirmation that "Blyss is alive" is real proof, not stock
          marketing copy. Hides itself when totals are zero on a
          fresh deploy. */}
      <StartStatsStrip stats={stats} />

      {/* 2 — What you can sell (REAL product categories) */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-24">
          <motion.div {...inViewProps}>
            <Eyebrow>What you can sell</Eyebrow>
            <h2
              className={cn(
                typography.h2,
                "mt-3 max-w-[20ch] text-[var(--text-primary)]",
              )}
            >
              Anything you can deliver as a file or a link.
            </h2>
            <p className="mt-4 max-w-[58ch] font-sans text-[16px] leading-[1.6] text-[var(--text-secondary)]">
              Start with the category closest to your work. Each link shows
              buyers what is already available on the marketplace.
            </p>
          </motion.div>

          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((c, i) => (
              <motion.li
                key={c.id}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{
                  duration: 0.5,
                  ease,
                  delay: Math.min(i, 5) * 0.06,
                }}
              >
                <Link
                  href={`/category/${c.slug}`}
                  className="group block rounded-md bg-[var(--surface-elevated)] p-6 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-[20px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {c.name}
                    </h3>
                    {c.product_count > 0 && (
                      <span className="font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
                        {c.product_count}{" "}
                        {c.product_count === 1 ? "product" : "products"}
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-2 font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]">
                      {c.description}
                    </p>
                  )}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3 — Who's already on Blyss (REAL creator categories) */}
      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-24">
        <motion.div {...inViewProps}>
          <Eyebrow>Who sells here</Eyebrow>
          <h2
            className={cn(
              typography.h2,
              "mt-3 max-w-[20ch] text-[var(--text-primary)]",
            )}
          >
            Designers, musicians, writers, photographers — and you.
          </h2>
          <p className="mt-4 max-w-[58ch] font-sans text-[16px] leading-[1.6] text-[var(--text-secondary)]">
            Blyss starts with Kenya's independent creative community and is
            designed to grow across East Africa as country support is verified.
          </p>
        </motion.div>

        <ul className="mt-10 flex flex-wrap gap-3">
          {creators.map((c, i) => (
            <motion.li
              key={c.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.4, ease, delay: Math.min(i, 8) * 0.04 }}
            >
              <Link
                href={`/creators?category=${c.slug}`}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 font-sans text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                {c.name}
              </Link>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* 4 — How payouts work */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-20 md:grid-cols-12 md:gap-16 md:px-16 md:py-24">
          <div className="md:col-span-5">
            <motion.div {...inViewProps}>
              <Eyebrow accent>Payouts</Eyebrow>
              <h2
                className={cn(typography.h2, "mt-3 text-[var(--text-primary)]")}
              >
                Set up payouts with M-Pesa or a Kenyan bank account.
              </h2>
            </motion.div>
          </div>
          <div className="md:col-span-7">
            <motion.dl
              {...inViewProps}
              className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-10"
            >
              <div>
                <dt className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  M-Pesa or bank
                </dt>
                <dd className="mt-2 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  Add your registered M-Pesa number or Kenyan bank account. Your
                  dashboard shows the destination and current payout status.
                </dd>
              </div>
              <div>
                <dt className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  visible payout status
                </dt>
                <dd className="mt-2 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  Once a buyer's payment clears, the order and payout status
                  remain visible in your dashboard.
                </dd>
              </div>
              <div>
                <dt className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  KSh for Kenyan sales
                </dt>
                <dd className="mt-2 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  Sell in Kenyan Shillings to Kenyan buyers. The order and
                  payout record shows the currency used for each sale.
                </dd>
              </div>
              <div>
                <dt className="font-display text-[18px] font-semibold text-[var(--text-primary)]">
                  Card buyers too
                </dt>
                <dd className="mt-2 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  Card availability is shown to each buyer at checkout. Your
                  order and payout record stays together in Blyss.
                </dd>
              </div>
            </motion.dl>
          </div>
        </div>
      </section>

      {/* 5 — What it costs */}
      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-32">
        <motion.div {...inViewProps}>
          <Eyebrow accent>The fees, in plain English</Eyebrow>
          <h2
            className={cn(
              typography.h2,
              "mt-3 max-w-[18ch] text-[var(--text-primary)]",
            )}
          >
            One fee. Only when you sell.
          </h2>
        </motion.div>

        <ul className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-10">
          {[
            {
              title: "20% per sale",
              body: "Blyss keeps 20% of each completed sale. The remaining 80% is your creator share, subject to any refund or reversal required by policy.",
            },
            {
              title: "No subscription",
              body: "You don't pay to open a storefront, list a product, or keep your store online. Sell once a year or a hundred times a day — same deal.",
            },
            {
              title: "No surprise bills",
              body: "No platform-side ads to buy and no paid tier hiding the core selling tools. Review the checkout total and payout status for each order in your dashboard.",
            },
          ].map((w, i) => (
            <motion.li
              key={w.title}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, ease, delay: i * 0.1 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)]/10">
                <FiCheck
                  size={20}
                  className="text-[var(--accent)]"
                  strokeWidth={2}
                />
              </div>
              <h3 className="mt-5 font-display text-[22px] font-semibold leading-[1.2] text-[var(--text-primary)]">
                {w.title}
              </h3>
              <p className="mt-3 font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                {w.body}
              </p>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* 6 — What happens after you sign up */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-24">
          <motion.div {...inViewProps}>
            <Eyebrow>The four steps from now to your first sale</Eyebrow>
            <h2
              className={cn(
                typography.h2,
                "mt-3 max-w-[20ch] text-[var(--text-primary)]",
              )}
            >
              No surprises after the signup button.
            </h2>
          </motion.div>

          <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Pick a handle",
                body: "Sign in with Google or email, then choose a storefront name and slug.",
              },
              {
                step: "02",
                title: "Add your details",
                body: "Drop in your bio, payout M-Pesa or bank account, and tell us what you make. We use this to set up payouts.",
              },
              {
                step: "03",
                title: "We review",
                body: "Complete the business and payout details requested in the setup flow. Blyss shows the review status and any action needed.",
              },
              {
                step: "04",
                title: "You go live",
                body: "Upload your first product. Share your storefront link. Start taking orders. We handle the payment side.",
              },
            ].map((s, i) => (
              <motion.li
                key={s.step}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="rounded-md bg-[var(--surface-elevated)] p-6"
              >
                <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] tabular-nums">
                  {s.step}
                </span>
                <h3 className="mt-4 font-display text-[20px] font-semibold text-[var(--text-primary)]">
                  {s.title}
                </h3>
                <p className="mt-2 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                  {s.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7 — What you need before you start */}
      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <motion.div {...inViewProps}>
              <Eyebrow>Before you sign up</Eyebrow>
              <h2
                className={cn(typography.h2, "mt-3 text-[var(--text-primary)]")}
              >
                Have these ready before you start.
              </h2>
            </motion.div>
          </div>
          <ul className="md:col-span-7 md:pt-2">
            {[
              {
                title: "A Kenyan M-Pesa number or bank account",
                body: "Registered in your name (or your business). This is where payouts land.",
              },
              {
                title: "At least one product to sell",
                body: "A file you own (PDF, ZIP, audio, video) or a link you can deliver after purchase. You can keep adding more later.",
              },
              {
                title: "A short bio + a profile photo",
                body: "Buyers want to know who they're buying from. Two sentences and a face go a long way.",
              },
              {
                title: "Your ID for payout verification",
                body: "Paystack may request identity or business details before a payout destination can be activated. The setup screen shows what is required.",
              },
            ].map((item, i) => (
              <motion.li
                key={item.title}
                initial={false}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="flex items-start gap-4 border-t border-[var(--border)] py-6 first:border-t-0 first:pt-0"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
                >
                  <FiCheck size={14} strokeWidth={2.5} />
                </span>
                <div>
                  <h3 className="font-display text-[18px] font-semibold leading-[1.3] text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
                    {item.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8 — FAQ */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 md:px-16 md:py-24">
          <motion.div {...inViewProps}>
            <Eyebrow>Honest answers</Eyebrow>
            <h2
              className={cn(
                typography.h2,
                "mt-3 max-w-[22ch] text-[var(--text-primary)]",
              )}
            >
              The questions creators actually ask before signing up.
            </h2>
          </motion.div>

          <dl className="mt-12 space-y-8 md:space-y-10">
            {[
              {
                q: "Who sees the money first — Blyss or me?",
                a: "Paystack processes the payment and Blyss records your creator share. The dashboard shows the order, clearance, and payout status.",
              },
              {
                q: "What if a buyer asks for a refund?",
                a: "Refunds follow the current Blyss refund policy and payment status. Read the policy before publishing so you know when a buyer may be eligible.",
              },
              {
                q: "Can I sell from outside Kenya?",
                a: "Blyss is built around Kenyan creator payouts today. East African expansion will be announced country by country as payment and payout support is verified.",
              },
              {
                q: "Do I need a registered business?",
                a: "You can begin as an individual, subject to the identity and payout verification shown during setup. Business requirements depend on the details you submit.",
              },
              {
                q: "What can I NOT sell here?",
                a: "Anything illegal, anything you don't own the rights to, adult content, weapons, drugs, or get-rich-quick schemes. Read the acceptable-use policy if unsure.",
              },
              {
                q: "How do I price my work?",
                a: "You set the price. Blyss does not benchmark or recommend. Look at /marketplace to see what comparable products go for and price from there.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.q}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, ease, delay: i * 0.05 }}
                className="grid grid-cols-1 gap-3 border-b border-[var(--border)] pb-8 md:grid-cols-12 md:gap-8"
              >
                <dt className="font-display text-[18px] font-semibold text-[var(--text-primary)] md:col-span-5">
                  {f.q}
                </dt>
                <dd className="font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)] md:col-span-7">
                  {f.a}
                </dd>
              </motion.div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/help"
              className="font-sans text-[14px] text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Read the full help centre
            </Link>
            <span
              aria-hidden="true"
              className="font-sans text-[var(--text-muted)]"
            >
              ·
            </span>
            <Link
              href="/terms"
              className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Terms
            </Link>
            <Link
              href="/refunds"
              className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Refunds
            </Link>
            <Link
              href="/acceptable-use"
              className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
            >
              Acceptable use
            </Link>
          </div>
        </div>
      </section>

      {/* 9 — Closing CTA (dark accent block) */}
      <section className="dark bg-[var(--background)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-[1280px] px-6 py-24 text-center md:px-16 md:py-32">
          <motion.h2
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-[20ch] font-display italic tracking-[-0.02em] leading-[1.05] text-[clamp(36px,5vw,64px)]"
          >
            Your shop is one signup away.
          </motion.h2>
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/dashboard/create"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Start selling
              <FiArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="font-sans text-[14px] text-[#BAB5A8] underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Already selling? Sign in
            </Link>
          </motion.div>
        </div>
      </section>

      <StartFooter />
    </div>
  );
};
