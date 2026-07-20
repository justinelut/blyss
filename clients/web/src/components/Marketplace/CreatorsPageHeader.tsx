import { Eyebrow, typography } from "@/design";
import { cn } from "@/lib/utils";

export function CreatorsPageHeader() {
  return (
    <header>
      <div className="mx-auto max-w-[1280px] px-6 pt-12 md:px-16 md:pt-20">
        <Eyebrow accent>Meet the makers</Eyebrow>
        <h1
          className={cn(
            typography.h1,
            "mt-4 max-w-[18ch] text-[var(--text-primary)]",
          )}
        >
          Kenya&rsquo;s creative class, online.
        </h1>
      </div>
    </header>
  );
}
