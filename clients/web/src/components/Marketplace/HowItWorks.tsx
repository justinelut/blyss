import { Eyebrow, SectionDivider, typography } from "@/design";
import { cn } from "@/lib/utils";

const steps = [
  { n: "01", text: "Browse digital products from independent creators." },
  { n: "02", text: "Check the price, format, licence, and what is included." },
  {
    n: "03",
    text: "Use the payment methods shown at checkout, then access your purchase online.",
  },
];

export const HowItWorks = () => (
  <SectionDivider tone="sunken" density="lg">
    <div className="mb-12">
      <Eyebrow>Buying on Blyss</Eyebrow>
      <h2
        className={cn(
          typography.h2,
          "mt-3 max-w-[18ch] text-[var(--text-primary)]",
        )}
      >
        Know what you are buying and who made it.
      </h2>
    </div>
    <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
      {steps.map((step) => (
        <li
          key={step.n}
          className="flex flex-col items-start border-t border-[var(--border)] pt-5"
        >
          <span
            className="font-display text-[38px] font-medium leading-none tabular-nums text-[var(--accent)]"
            aria-hidden="true"
          >
            {step.n}
          </span>
          <p className="mt-5 max-w-[30ch] font-display text-[18px] leading-[1.45] text-[var(--text-primary)] md:text-[20px]">
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  </SectionDivider>
);
