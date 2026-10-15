import { createMemo, For, Show } from "solid-js";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { promotionBadgeLabel, promotionIsStoreWide, promotionTouchesProduct } from "~/lib/adminMarketing";
import type { Product } from "~/lib/types";

/** One promo badge look for card and PDP: red text on the soft red fill, regular weight. On cards the text is 11px, the size of the rating / sold line (`ProductMeta`). */
const BADGE = "shrink-0 whitespace-nowrap rounded-pill bg-danger-soft font-normal text-danger-strong";

/**
 * Which live promotions this product takes part in, any tool (product-specific
 * ones first, then store-wide).
 * - `card`: one row of badges; more than fits scrolls sideways.
 * - `pdp`: every promotion as a wrapping row above the product name.
 */
export function PromotionBadges(props: {
  product: Product;
  variant: "card" | "pdp";
  class?: string;
  /** Grid cards: keep the badge row's height when there's no promo, so every card's name starts at the same line. */
  reserveSpace?: boolean;
}) {
  const store = useStorefrontPromotions();
  const promos = createMemo(() =>
    store
      .promotions()
      // Every tool: a bundle / buy X get Y by its items, the rest by their product scope (`promotions()` is already live + in this shopper's กลุ่มลูกค้า).
      .filter((p) => p.showBadge !== false && promotionTouchesProduct(p, props.product.id))
      // Product-specific first, so the card's one badge is the most relevant.
      .sort((a, b) => Number(!promotionIsStoreWide(b)) - Number(!promotionIsStoreWide(a))),
  );

  return (
    <Show when={promos().length > 0} fallback={props.reserveSpace ? <div class={`h-4 ${props.class ?? ""}`} aria-hidden="true" /> : undefined}>
      <Show
        when={props.variant === "pdp"}
        fallback={
          <ul class={`no-scrollbar flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain ${props.class ?? ""}`} aria-label="โปรโมชั่นที่ร่วมรายการ">
            <For each={promos()}>
              {(p) => <li class={`${BADGE} px-1.5 text-[11px] leading-4`}>{promotionBadgeLabel(p)}</li>}
            </For>
          </ul>
        }
      >
        <ul class={`flex flex-wrap gap-2 ${props.class ?? ""}`} aria-label="โปรโมชั่นที่ร่วมรายการ">
            <For each={promos()}>
              {(p) => <li class={`${BADGE} px-2.5 py-0.5 text-xs leading-5`}>{promotionBadgeLabel(p)}</li>}
            </For>
        </ul>
      </Show>
    </Show>
  );
}
