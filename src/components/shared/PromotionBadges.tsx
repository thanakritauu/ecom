import { createMemo, For, Show } from "solid-js";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { promotionBadgeLabel } from "~/lib/adminMarketing";
import type { Product } from "~/lib/types";

/** One promo badge look for card and PDP: red text on the soft red fill, regular weight. On cards the text is 11px, the size of the rating / sold line (`ProductMeta`). */
const BADGE = "shrink-0 whitespace-nowrap rounded-pill bg-danger-soft font-normal text-danger-strong";

/**
 * Which live promotions this product takes part in (product-specific ones
 * first, then store-wide).
 * - `card`: one row of badges; more than fits scrolls sideways.
 * - `pdp`: every promotion as a wrapping row above the product name.
 */
export function PromotionBadges(props: { product: Product; variant: "card" | "pdp"; class?: string }) {
  const store = useStorefrontPromotions();
  const promos = createMemo(() =>
    store
      .promotions()
      .filter((p) => p.productIds.length === 0 || p.productIds.includes(props.product.id))
      // Product-specific first, so the card's one badge is the most relevant.
      .sort((a, b) => Number(b.productIds.length > 0) - Number(a.productIds.length > 0)),
  );

  return (
    <Show when={promos().length > 0}>
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
