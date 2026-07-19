import Link from "./LocaleLink";

export const ClosingCtaBand = () => (
  <section className="dark bg-[var(--background)] text-[var(--text-primary)]">
    <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:px-8 md:py-20 lg:px-16 lg:py-24">
      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h2 className="max-w-[18ch] pb-2 font-display text-[clamp(34px,5vw,60px)] font-semibold leading-[1.06] tracking-[-0.025em]">
            Browse the full catalogue.
          </h2>
          <p className="mt-4 max-w-[48ch] font-sans text-[15px] leading-[1.6] text-[var(--text-secondary)] sm:text-[16px]">
            Search every available product, category, creator, and subscription
            on Blyss.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/marketplace"
            className="inline-flex h-12 items-center whitespace-nowrap rounded-md bg-[var(--accent)] px-6 font-sans text-[15px] font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
          >
            Browse products
          </Link>
          <Link
            href="/start"
            className="inline-flex h-12 items-center whitespace-nowrap font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            Start selling
          </Link>
        </div>
      </div>
    </div>
  </section>
);
