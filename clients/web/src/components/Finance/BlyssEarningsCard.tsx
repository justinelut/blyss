/* Hallmark · component: finance/blyss-earnings · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 *
 * BlyssEarningsCard — shown to creators with an active Paystack
 * subaccount on /finance/income and /finance/payouts.
 *
 * Paystack splits the creator share into a linked subaccount. There is no
 * Blyss withdrawal balance for creators to withdraw from. Settlement timing
 * follows Paystack's schedule and can vary.
 *
 * The card explains the split and pairs order-derived totals with the
 * settlement ledger below.
 */
"use client";

import { schemas } from "@/lib/api";
import { useEarningsSummary } from "@/hooks/queries/orders";
import { FiCheck } from "react-icons/fi";

interface BlyssEarningsCardProps {
  organization: schemas["Organization"];
}

const formatMoney = (amountMinor: number, currency: string): string => {
  const major = (amountMinor || 0) / 100;
  const cur = (currency || "kes").toUpperCase();
  if (cur === "KES") return `KSh ${major.toLocaleString("en-KE")}`;
  if (cur === "USD") return `US$ ${major.toLocaleString("en-US")}`;
  return `${cur} ${major.toLocaleString()}`;
};

export const BlyssEarningsCard: React.FC<BlyssEarningsCardProps> = ({
  organization,
}) => {
  const { data: earnings } = useEarningsSummary(organization.id);
  const payoutMethod = (organization as { payout_method?: string })
    .payout_method;
  const mpesaNumber = (organization as { mpesa_number?: string }).mpesa_number;
  const bankAccountNumber = (organization as { bank_account_number?: string })
    .bank_account_number;
  const payoutReady =
    (organization as { subaccount_status?: string }).subaccount_status ===
      "active" &&
    Boolean(
      (organization as { subaccount_code?: string | null }).subaccount_code,
    );

  const destination =
    payoutMethod === "mpesa" && mpesaNumber
      ? `M-Pesa ${mpesaNumber}`
      : payoutMethod === "bank" && bankAccountNumber
        ? `bank account ending ${String(bankAccountNumber).slice(-4)}`
        : "your payout account";

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
          <FiCheck
            size={18}
            className="text-[var(--accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Earnings
            </p>
            <h2 className="mt-2 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
              {payoutReady
                ? `Creator shares settle through Paystack to ${destination}.`
                : "Set up a Paystack payout account to receive creator shares."}
            </h2>
          </div>

          {/* Order-derived totals are not a confirmation of provider
              settlement. The ledger below shows confirmed transfers where
              Paystack events are available and labels estimates clearly. */}
          {earnings && earnings.orders_count > 0 && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 sm:grid-cols-4">
              <div>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Recorded creator share
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatMoney(earnings.net_amount, earnings.currency)}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Gross sales
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tabular-nums text-[var(--text-secondary)]">
                  {formatMoney(earnings.gross_amount, earnings.currency)}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Marketplace fee
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tabular-nums text-[var(--text-secondary)]">
                  {formatMoney(earnings.platform_fee_amount, earnings.currency)}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Orders
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tabular-nums text-[var(--text-secondary)]">
                  {earnings.orders_count.toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <p className="max-w-[60ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
            On a completed product sale, 20% is Blyss&apos;s platform fee and
            the remaining 80% is your creator share.{" "}
            {payoutReady ? (
              <>
                Paystack splits that share to your linked payout account and
                charges its processing fee separately to Blyss&apos;s main
                account. Paystack settles to your{" "}
                {payoutMethod === "mpesa" ? "M-Pesa account" : "bank account"}{" "}
                on its schedule. Confirmed settlement events appear below when
                available; estimates are marked.
              </>
            ) : (
              <>
                Set up and activate a Paystack payout account to receive
                automatic split settlements.
              </>
            )}{" "}
            Refunds or reversals can change an order&apos;s final amounts.
          </p>
        </div>
      </div>
    </div>
  );
};
