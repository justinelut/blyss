import { SectionDivider } from "@/design";

const steps = [
  {
    n: "01",
    title: "Choose a product",
    text: "Check the format, licence, creator, price, and everything included.",
  },
  {
    n: "02",
    title: "Use your checkout options",
    text: "Available payment methods follow the region selected on Blyss.",
  },
  {
    n: "03",
    title: "Access your purchase",
    text: "Open your digital purchase online after checkout is complete.",
  },
];

export const HowItWorks = () => (
  <SectionDivider
    tone="default"
    density="lg"
    containerClassName="px-4 sm:px-6 md:px-8 lg:px-16"
  >
    <div className="mb-8 sm:mb-10">
      <h2 className="max-w-[18ch] pb-1 font-display text-[clamp(30px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--text-primary)]">
        How buying works
      </h2>
      <p className="mt-3 max-w-[48ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)] sm:text-[15px]">
        Know what you are buying, who made it, and how you will receive it.
      </p>
    </div>

    <ol className="grid min-w-0 grid-cols-1 gap-x-8 md:grid-cols-3">
      {steps.map((step) => (
        <li
          key={step.n}
          className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-t border-[var(--border)] py-5 md:block"
        >
          <span className="font-sans text-[11px] font-semibold tabular-nums text-[var(--accent)]">
            {step.n}
          </span>
          <div className="min-w-0 md:mt-5">
            <h3 className="font-display text-[18px] font-semibold leading-[1.3] text-[var(--text-primary)]">
              {step.title}
            </h3>
            <p className="mt-2 max-w-[32ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              {step.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </SectionDivider>
);
