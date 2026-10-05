import { Show } from "solid-js";
import { FREE_SHIPPING_THRESHOLD } from "~/lib/cartSelectors";
import { formatTHB } from "./PriceDisplay";

/**
 * Shown in both the Cart Drawer (node 153:19197) and the Cart Page (node
 * 153:16170) — same ฿990 threshold Home already advertises, same
 * `total` the rest of the cart UI uses, so the two never disagree about how
 * close a shopper is to free shipping. `showAmounts` renders the Page's
 * extra "ยอดในตะกร้า X / ขั้นต่ำ Y" line, which the Drawer's narrower width
 * doesn't have room for.
 *
 * Not rendered for now — the cart UI leads with `GiftPromotionBanner`;
 * free shipping itself still applies at Checkout.
 */
export function FreeShippingBanner(props: { total: number; showAmounts?: boolean }) {
  const remaining = () => Math.max(0, FREE_SHIPPING_THRESHOLD - props.total);
  const progress = () => Math.min(100, (props.total / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Show
      when={remaining() > 0}
      fallback={
        <div class="rounded-card bg-gradient-to-r from-[#7650FF] to-[#27CD97] p-4 text-sm font-semibold text-white">
          🎉 คุณได้รับสิทธิ์จัดส่งฟรีแล้ว!
        </div>
      }
    >
      <div class="flex flex-col gap-2 rounded-card bg-gradient-to-r from-[#7650FF] to-[#27CD97] p-4">
        <div class="flex flex-wrap items-center justify-between gap-1 text-white">
          <p class="text-sm font-semibold">ซื้อเพิ่มอีก {formatTHB(remaining())} รับส่งฟรีทันที!</p>
          <Show when={props.showAmounts}>
            <p class="text-sm">
              ยอดในตะกร้า {formatTHB(props.total)} / ขั้นต่ำ {formatTHB(FREE_SHIPPING_THRESHOLD)}
            </p>
          </Show>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-pill bg-white/30">
          <div class="h-full rounded-pill bg-white transition-[width] duration-300" style={{ width: `${progress()}%` }} />
        </div>
      </div>
    </Show>
  );
}
