import { For } from "solid-js";
import type { PromoDiscountRow } from "~/lib/promotionEngine";
import { formatTHB } from "./PriceDisplay";

/**
 * One row per cart-level promo the order got ("ยิ่งซื้อยิ่งคุ้ม -฿60"): the
 * same rows, from the same `priceCart`, in the mini cart, the cart page and
 * the checkout summary. `onPink` = the mini cart's pink total box.
 */
export function PromoDiscountRows(props: { rows: PromoDiscountRow[]; onPink?: boolean }) {
  return (
    <For each={props.rows}>
      {(row) => (
        <div class="flex items-start justify-between gap-3 text-sm">
          <span class="min-w-0" classList={{ "text-ink-gray": !props.onPink, "text-white/90": props.onPink }}>
            {row.name}
          </span>
          <span class="shrink-0 font-bold" classList={{ "text-success": !props.onPink, "text-white": props.onPink }}>
            -{formatTHB(row.amount)}
          </span>
        </div>
      )}
    </For>
  );
}
