"use client";

import { useEffect } from "react";
import { useCartForOrganization, useCartGrouped } from "@/hooks/queries/cart";

interface CartCountProps {
  scope: "marketplace" | { organizationId: string };
  onCountChange: (count: number) => void;
}

export function CartCount({ scope, onCountChange }: CartCountProps) {
  const groupedQuery = useCartGrouped(scope === "marketplace");
  const scopedQuery = useCartForOrganization(
    typeof scope === "object" ? scope.organizationId : undefined,
    typeof scope === "object",
  );
  const count =
    scope === "marketplace"
      ? (groupedQuery.data?.item_count ?? 0)
      : ((scopedQuery.data as { item_count?: number } | undefined)
          ?.item_count ?? 0);

  useEffect(() => {
    onCountChange(count);
  }, [count, onCountChange]);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 font-sans text-[10px] font-semibold tabular-nums text-[var(--accent-foreground)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
