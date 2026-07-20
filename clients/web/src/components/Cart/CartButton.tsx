"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import { useAuth } from "@/hooks/auth";
import { cn } from "@/lib/utils";

const CartCount = dynamic(
  () => import("./CartCount").then((module) => module.CartCount),
  { ssr: false },
);
const CartDrawer = dynamic(
  () => import("./CartDrawer").then((module) => module.CartDrawer),
  { ssr: false },
);

interface CartButtonProps {
  className?: string;
  /**
   * Scope:
   *   - undefined → marketplace (default): badge counts items across
   *     ALL creators' carts
   *   - { organizationId } → creator-storefront: badge counts only
   *     that creator's items
   * Same prop is forwarded to CartDrawer so click-to-open keeps the
   * scope consistent.
   */
  scope?: "marketplace" | { organizationId: string };
}

/**
 * CartButton — header cart icon with item count badge.
 *
 * In the marketplace context (default) the badge sums items across
 * every creator's cart. On a creator's storefront the badge shows only
 * that creator's count. Click opens CartDrawer with matching scope.
 */
export const CartButton = ({
  className,
  scope = "marketplace",
}: CartButtonProps) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const { authenticated } = useAuth();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cart (${count} items)`}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
          className,
        )}
      >
        <FiShoppingBag size={20} />

        {authenticated && <CartCount scope={scope} onCountChange={setCount} />}
      </button>

      {open && <CartDrawer open onOpenChange={setOpen} scope={scope} />}
    </>
  );
};
