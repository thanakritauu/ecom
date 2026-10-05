import type { GiftPromotionState } from "~/lib/cartSelectors";
import { formatTHB } from "./PriceDisplay";
import { GiftIcon } from "./icons";

/**
 * The unlocked free gift as a cart line — same image/text sizing as
 * `CartItemRow` (drawer vs. page), but read-only: no stepper, no remove,
 * since the gift follows the subtotal rather than being a `CartLine`.
 */
export function GiftItemRow(props: { gift: GiftPromotionState; variant?: "drawer" | "page" }) {
  const layout = () => props.variant ?? "drawer";
  const { product } = props.gift;

  return (
    <li
      class="flex list-none gap-4"
      classList={{ "rounded-card border border-[#7650FF]/30 bg-[#7650FF]/5 p-4": layout() === "page" }}
    >
      <div
        class="shrink-0 overflow-hidden rounded-media border border-surface-gray"
        classList={{ "size-20": layout() === "drawer", "size-24": layout() === "page" }}
      >
        <img src={product.image} alt={product.name} class="size-full object-cover" />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <span class="inline-flex w-fit items-center gap-1 rounded-pill bg-gradient-to-r from-[#7650FF] to-[#27CD97] px-2 py-0.5 text-xs font-semibold text-white">
          <GiftIcon class="size-3.5" /> ของแถมฟรี
        </span>
        <p class="line-clamp-2 font-medium leading-[1.75] text-ink" classList={{ "text-sm": layout() === "drawer", "text-base": layout() === "page" }}>
          {product.name}
        </p>
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-3">
            <span class="text-base font-bold text-system-red">ฟรี</span>
            <span class="text-ink-gray line-through">{formatTHB(product.compareAtPrice ?? product.price)}</span>
          </div>
          <span class="text-sm text-ink-gray">x{props.gift.qty}</span>
        </div>
      </div>
    </li>
  );
}
