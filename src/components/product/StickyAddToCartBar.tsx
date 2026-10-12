import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { isServer } from "solid-js/web";
import type { Product, ProductVariant } from "~/lib/types";
import { PurchaseFooter } from "../shared/PurchaseFooter";
import { resolveVariantOption } from "~/lib/productVariants";

/**
 * Figma (node 134:6621) places this directly above the Footer, but a static
 * mid-page bar duplicating the exact same content the shopper just scrolled
 * past isn't useful — this is the standard "sticky once the primary Add to
 * Cart button leaves the viewport" ecommerce pattern, watching that button
 * with an IntersectionObserver rather than a scroll-position math (which is
 * what Header's own hide-on-scroll already avoids doing manually where it
 * can, so this mirrors that preference for the platform-native API).
 *
 * Content is the Product Option Modal's buy row (`PurchaseFooter`): photo +
 * price + compare-at price on the left, quantity + add-to-cart on the right.
 * Its quantity is the PDP's own, so the bar and the main stepper stay in sync.
 */
export function StickyAddToCartBar(props: {
  product: Product;
  selectedVariant: ProductVariant | undefined;
  quantity: number;
  onQuantityChange: (n: number) => void;
  maxQuantity?: number;
  watchRef: HTMLElement | undefined;
  onAddToCart: () => void;
  addStatus: "idle" | "loading" | "error";
  outOfStock: boolean;
}) {
  const [visible, setVisible] = createSignal(false);

  onMount(() => {
    if (isServer || !props.watchRef) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: "-1px 0px 0px 0px",
    });
    observer.observe(props.watchRef);
    onCleanup(() => observer.disconnect());
  });

  const image = () => props.selectedVariant?.image ?? props.product.image;
  // Same price as the PDP's main buy row: the picked option's (flash sale may differ per option).
  const shown = () => {
    if (!props.selectedVariant) return { price: props.product.price, compareAtPrice: props.product.compareAtPrice };
    const o = resolveVariantOption(props.product, props.selectedVariant);
    return { price: o.price, compareAtPrice: o.compareAtPrice };
  };

  return (
    <Show when={visible()}>
      <div
        data-sticky-add-to-cart
        // `bottom-16` on Tablet/Mobile clears BottomNav's own `min-h-16`
        // (Global Responsive §4) — PDP's Header is never `minimal`, so this
        // bar and BottomNav are always on-screen together there.
        class="fixed inset-x-0 bottom-16 z-20 border-t border-surface-gray bg-white shadow-[0_-2px_12px_rgba(90,106,133,0.10)] lg:bottom-0"
        style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
      >
        <div class="mx-auto max-w-container-wide px-4 py-2.5 sm:py-3 lg:px-[150px]">
          <PurchaseFooter
            layout="bar"
            image={image()}
            optionLabel={props.selectedVariant?.label}
            price={shown().price}
            compareAtPrice={shown().compareAtPrice}
            quantity={props.quantity}
            onQuantityChange={props.onQuantityChange}
            maxQuantity={props.maxQuantity}
            outOfStock={props.outOfStock}
            loading={props.addStatus === "loading"}
            onAdd={props.onAddToCart}
          />
        </div>
      </div>
    </Show>
  );
}
