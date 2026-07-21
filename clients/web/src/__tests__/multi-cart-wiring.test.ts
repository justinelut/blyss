import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Multi-creator cart: add-to-cart wiring guardrails.
 *
 * The buyer's cart is the aggregation of N per-creator carts. Polar's
 * transactional model is per-org: every Order, Subscription, and
 * Checkout resolves to one Organization. Cross-creator combined
 * checkout is intentionally not supported.
 *
 * These tests pin a few invariants we rely on so the multi-cart
 * design doesn't quietly regress:
 *
 *   1. Frontend never sends an organization_id in the add-to-cart
 *      request body — backend resolves it from product.organization_id
 *      server-side. This keeps "Add to cart" buttons stateless from
 *      any surface (homepage, search, creator storefront) — the
 *      product itself carries the routing.
 *
 *   2. CartButton + CartDrawer accept a `scope` prop with two shapes:
 *      'marketplace' (default) and { organizationId }.
 *
 *   3. CartPage uses useCartGrouped (multi-creator) not useCart
 *      (legacy flat).
 *
 *   4. Per-creator checkout endpoint is called with organization_id.
 *
 *   5. Sequential checkout 'continue' surface exists on the
 *      confirmation page after a successful purchase.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Multi-creator cart wiring", () => {
  test("frontend add-to-cart sends only product_id (org resolved server-side)", () => {
    const cartHooks = read("src/hooks/queries/cart.ts");
    // POST body in useAddToCart contains product_id + quantity, no
    // organization_id field. Accepts both the typed `api.POST` and
    // the `(api as any).POST` cast — we use the cast when the OpenAPI
    // spec hasn't been regenerated yet to include a new query param.
    expect(cartHooks).toMatch(
      /\(?api( as any)?\)?\.POST\('\/v1\/cart\/items',[\s\S]*?body:\s*\{[\s\S]*?product_id:[\s\S]*?\}/,
    );
    // Negative: no organization_id leaks into the add-item payload.
    const addBlock = cartHooks.match(
      /useAddToCart[\s\S]*?onSuccess:[\s\S]*?\}\)/,
    )?.[0];
    expect(addBlock).toBeTruthy();
    expect(addBlock).not.toContain("organization_id");
  });

  test("useCartGrouped + useCartForOrganization + useCheckoutCartForOrganization exist", () => {
    const cartHooks = read("src/hooks/queries/cart.ts");
    expect(cartHooks).toContain("export const useCartGrouped");
    expect(cartHooks).toContain("export const useCartForOrganization");
    expect(cartHooks).toContain("export const useCheckoutCartForOrganization");
    expect(cartHooks).toContain("'/v1/cart/grouped'");
    expect(cartHooks).toContain("organization_id");
  });

  test("CartButton accepts scope prop and forwards it to lazy count and drawer", () => {
    const button = read("src/components/Cart/CartButton.tsx");
    const count = read("src/components/Cart/CartCount.tsx");
    expect(button).toMatch(/scope\?:\s*['"]marketplace['"]\s*\|/);
    expect(button).toMatch(/import\(["']\.\/CartCount["']\)/);
    expect(button).toMatch(/import\(["']\.\/CartDrawer["']\)/);
    expect(count).toContain("useCartGrouped");
    expect(count).toContain("useCartForOrganization");
    expect(button).toMatch(/<CartDrawer[\s\S]*?scope=\{scope\}/);
  });

  test("CartDrawer renders per-creator sections in marketplace scope", () => {
    const drawer = read("src/components/Cart/CartDrawer.tsx");
    expect(drawer).toContain("MarketplaceCartDrawer");
    expect(drawer).toContain("CreatorCartDrawer");
    expect(drawer).toContain("useCartGrouped");
    expect(drawer).toContain("useCheckoutCartForOrganization");
    // Per-creator "Pay {Name}" button references the creator name
    expect(drawer).toMatch(/Pay \$\{group\.organization\.name\}/);
  });

  test("CartPage uses grouped hook (not legacy flat useCart)", () => {
    const page = read("src/components/Cart/CartPage.tsx");
    expect(page).toContain("useCartGrouped");
    expect(page).toContain("useCheckoutCartForOrganization");
    // No combined-pay button — pay actions are per-creator
    expect(page).toMatch(/Pay \$\{group\.organization\.name\}/);
  });

  test("Creator storefront mounts cart with creator scope", () => {
    // The cart + account cluster moved out of the hero into the
    // StorefrontActionBar, which is rendered inside the sticky
    // StorefrontTabs bar so it rides along on scroll instead of
    // scrolling away with the banner.
    const actionBar = read(
      "src/components/CreatorStorefront/StorefrontActionBar.tsx",
    );
    expect(actionBar).toContain("from '@/components/Cart/CartButton'");
    expect(actionBar).toMatch(/scope=\{\{\s*organizationId\s*\}\}/);
  });

  test("SequentialCheckoutContinue surfaces remaining carts after a checkout", () => {
    const continueComp = read(
      "src/components/Checkout/SequentialCheckoutContinue.tsx",
    );
    expect(continueComp).toContain("useCartGrouped");
    expect(continueComp).toContain("useCheckoutCartForOrganization");
    expect(continueComp).toContain("justCompletedOrganizationId");
    // Hides itself when there are no other carts pending
    expect(continueComp).toContain("if (remaining.length === 0) return null");

    // Mounted in CheckoutConfirmation succeeded branch
    const conf = read("src/components/Checkout/CheckoutConfirmation.tsx");
    expect(conf).toContain("SequentialCheckoutContinue");
  });
});


test("cart and direct-product checkout mutations forward display currency", () => {
  const cartHooks = read("src/hooks/queries/cart.ts");
  const checkoutHooks = read("src/hooks/queries/checkouts.ts");

  expect(cartHooks).toMatch(
    /useCheckoutCart[\s\S]*?useDisplayCurrency\(\)[\s\S]*?\/v1\/cart\/checkout[\s\S]*?query:\s*\{\s*currency\s*\}/,
  );
  expect(cartHooks).toMatch(
    /useCheckoutCartForOrganization[\s\S]*?useDisplayCurrency\(\)[\s\S]*?organization_id:\s*organizationId,\s*currency/,
  );
  expect(checkoutHooks).toMatch(
    /useCreateProductCheckout[\s\S]*?useDisplayCurrency\(\)[\s\S]*?\/v1\/cart\/checkout\/product[\s\S]*?query:\s*\{\s*currency\s*\}/,
  );
});