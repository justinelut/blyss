"use client";

/* Hallmark · component: settings/payouts-step · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * AccountStep — wraps OrganizationMPesaSettings inside the Finance review
 * flow. Previously rendered a shadcn <Card> with lucide icons; now uses
 * a plain hairline-bordered surface and react-icons to match the rest of
 * the marketplace surface.
 */

import { schemas } from "@/lib/api";
import { FiArrowRight, FiUser } from "react-icons/fi";
import OrganizationMPesaSettings from "@/components/Settings/OrganizationMPesaSettings";

interface AccountStepProps {
  organization: schemas["Organization"];
  isNotAdmin: boolean;
  onSkipAccountSetup?: () => void;
}

export default function AccountStep({
  organization,
  isNotAdmin,
  onSkipAccountSetup,
}: AccountStepProps) {
  if (isNotAdmin) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-sunken)]">
            <FiUser
              size={20}
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            />
          </div>
          <div>
            <h4 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Account setup restricted
            </h4>
            <p className="mt-2 max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              You aren&rsquo;t the owner of this shop. Only the account admin
              can set up payouts.
            </p>
          </div>
          {onSkipAccountSetup && (
            <button
              type="button"
              onClick={onSkipAccountSetup}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Skip & continue
              <FiArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <OrganizationMPesaSettings organization={organization} />
    </div>
  );
}
