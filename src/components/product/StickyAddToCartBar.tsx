import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { isServer } from "solid-js/web";
import type { Product, ProductVariant } from "~/lib/types";
import { PriceDisplay } from "../shared/PriceDisplay";
import { Button } from "../shared/Button";

/**
 * Figma (node 134:6621) places this directly above the Footer, but a static
 * mid-page bar duplicating the exact same content the shopper just scrolled
 * past isn't useful — this is the standard "sticky once the primary Add to
 * Cart button leaves the viewport" ecommerce pattern, watching that button
 * with an IntersectionObserver rather than a scroll-position math (which is
 * what Header's own hide-on-scroll already avoids doing manually where it
 * can, so this mirrors that preference for the platform-native API).
 */
export function StickyAddToCartBar(props: {
  product: Product;
  selectedVariant: ProductVariant | undefined;
  quantity: number;
  watchRef: HTMLElement | undefined;
  onAddToCart: () => void;
  onBuyNow: () => void;
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
  const variantAndQty = () =>
    `${props.selectedVariant ? `${props.selectedVariant.label} · ` : ""}จำนวน ${props.quantity}`;

  return (
    <Show when={visible()}>
      <div
        // `bottom-16` on Tablet/Mobile clears BottomNav's own `min-h-16`
        // (Global Responsive §4) — PDP's Header is never `minimal`, so this
        // bar and BottomNav are always on-screen together there.
        class="fixed inset-x-0 bottom-16 z-20 border-t border-surface-gray bg-white shadow-[0_-2px_12px_rgba(90,106,133,0.10)] lg:bottom-0"
        style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
      >
        <div class="mx-auto flex max-w-container-wide items-center gap-3 px-4 py-3 lg:gap-4 lg:px-[150px]">
          <img src={image()} alt="" class="size-11 shrink-0 rounded-media border border-surface-gray object-cover lg:size-[52px]" />
          <div class="hidden min-w-0 flex-1 lg:block">
            <p class="truncate text-base font-medium text-ink">{props.product.name}</p>
            <p class="truncate text-sm text-ink-gray">{variantAndQty()}</p>
          </div>
          <div class="min-w-0 flex-1 lg:hidden">
            <p class="truncate text-sm font-medium text-ink">{props.product.name}</p>
          </div>
          <div class="hidden shrink-0 items-end gap-2 lg:flex">
            <PriceDisplay price={props.product.price} compareAtPrice={props.product.compareAtPrice} />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            class="shrink-0"
            loading={props.addStatus === "loading"}
            disabled={props.outOfStock}
            onClick={props.onAddToCart}
          >
            {props.outOfStock ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
          </Button>
          <Button type="button" variant="outline" size="sm" class="hidden shrink-0 sm:inline-flex" disabled={props.outOfStock} onClick={props.onBuyNow}>
            ซื้อเลย
          </Button>
        </div>
      </div>
    </Show>
  );
}
