import Link from "next/link";

export const ClosingCtaBand = () => (
  <section className="dark relative overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
    <div className="mx-auto max-w-[1280px] px-6 py-24 text-center md:px-16 md:py-32">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Keep looking
      </p>
      <h2 className="mx-auto mt-4 max-w-[18ch] font-display text-[clamp(36px,5vw,64px)] font-medium leading-[1.05] tracking-[-0.02em]">
        <em className="font-display">Find work worth keeping.</em>
      </h2>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
        <Link
          href="/marketplace"
          className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-7 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          Browse products
        </Link>
        <Link
          href="/start"
          className="font-sans text-[14px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
        >
          Sell your work on Blyss
        </Link>
      </div>
    </div>
  </section>
);
