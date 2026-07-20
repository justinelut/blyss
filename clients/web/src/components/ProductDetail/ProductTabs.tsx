"use client";

import { useState } from "react";
import { schemas } from "@/lib/api";
import { typography } from "@/design";
import { LegalDoc } from "@/design/LegalDoc";
import { cn } from "@/lib/utils";
import { FiFileText, FiCheck } from "react-icons/fi";

type Product = schemas["Product"];

type TabId = "description" | "included" | "benefits" | "reviews";

interface Tab {
  id: TabId;
  label: string;
  disabled?: boolean;
}

export interface ProductTabsProps {
  product: Product;
  reviewsContent?: React.ReactNode;
}

/**
 * ProductTabs — Description / What's included / Benefits / Reviews.
 *
 * Editorial tab strip with accent underline. Panels use generous padding and
 * the design type scale. Benefits render `benefit.description` only (no `name`
 * field exists on the Benefit object).
 */
export const ProductTabs = ({ product, reviewsContent }: ProductTabsProps) => {
  const [active, setActive] = useState<TabId>("description");

  const benefits = product.benefits ?? [];
  const medias = product.medias ?? [];
  const hasDescription = !!product.description?.trim();
  const hasIncludes = medias.length > 0 || product.is_recurring;
  const hasBenefits = benefits.length > 0;

  const tabs: Tab[] = [
    { id: "description", label: "Description", disabled: !hasDescription },
    { id: "included", label: "What's included", disabled: !hasIncludes },
    { id: "benefits", label: "Benefits", disabled: !hasBenefits },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <div>
      {/* Tab strip */}
      <nav
        aria-label="Product details"
        className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
      >
        <div className="flex min-w-max items-center gap-0 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActive(tab.id)}
              className={cn(
                "relative inline-flex h-12 items-center px-5 font-sans text-[14px] font-medium transition-colors duration-200",
                tab.id === active
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                tab.disabled && "cursor-not-allowed opacity-30",
              )}
            >
              {tab.label}
              {tab.id === active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 -bottom-px h-[2px] rounded-full bg-[var(--accent)]"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Panels */}
      <div className="pt-10 pb-2">
        {active === "description" && hasDescription && (
          <div className="max-w-[64ch]">
            <LegalDoc>{product.description!}</LegalDoc>
          </div>
        )}

        {active === "included" && (
          <div className="flex max-w-[56ch] flex-col gap-3">
            {medias.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg bg-[var(--surface-sunken)] px-5 py-4"
              >
                <FiFileText
                  size={18}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="flex-1 font-sans text-[14px] font-medium text-[var(--text-primary)]">
                  {(m as any).name || `File ${i + 1}`}
                </span>
                <span className="font-sans text-[12px] uppercase tracking-wide text-[var(--text-muted)]">
                  {((m as any).mime_type ?? "").split("/")[1] || ""}
                </span>
              </div>
            ))}
            {product.is_recurring && benefits.length > 0 && (
              <div className="mt-6">
                <p className={cn(typography.eyebrow, "mb-4")}>
                  Subscription includes
                </p>
                <ul className="flex flex-col gap-3">
                  {benefits.map((b: any, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 font-sans text-[14px] leading-[1.5] text-[var(--text-secondary)]"
                    >
                      <FiCheck
                        size={15}
                        className="mt-0.5 shrink-0 text-[var(--accent)]"
                      />
                      {b.description || "Benefit"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {active === "benefits" && (
          <ul className="flex max-w-[56ch] flex-col gap-4">
            {benefits.map((b: any, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]"
              >
                <FiCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                />
                <span>{b.description}</span>
              </li>
            ))}
          </ul>
        )}

        {active === "reviews" && (
          <div>{reviewsContent ?? <EmptyReviews />}</div>
        )}
      </div>
    </div>
  );
};

function EmptyReviews() {
  return (
    <div className="max-w-[44ch]">
      <h3 className={cn(typography.h4, "text-[var(--text-primary)]")}>
        No reviews yet
      </h3>
      <p className="mt-3 font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
        Only verified buyers can leave a review. Be the first after purchasing.
      </p>
    </div>
  );
}
