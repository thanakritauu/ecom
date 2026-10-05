import { Show } from "solid-js";
import type { GiftPromotionState } from "~/lib/cartSelectors";
import { formatTHB } from "./PriceDisplay";
import { CheckBadge, GiftIcon } from "./icons";

/**
 * "ซื้อครบ ฿X รับฟรีสินค้า Y ทันที" — leads the Cart Drawer and Cart Page in
 * place of `FreeShippingBanner` (free shipping still applies; see
 * `GIFT_PROMOTION` in cartSelectors.ts). Same layout/props as that banner so
 * the two stay interchangeable; the gift's photo sits on the left so the
 * shopper sees what they're working toward.
 */
export function GiftPromotionBanner(props: { gift: GiftPromotionState; total: number; showAmounts?: boolean }) {
  const progress = () => Math.min(100, (props.total / props.gift.threshold) * 100);

  return (
    <div class="flex items-center gap-3 rounded-card bg-gradient-to-r from-[#7650FF] to-[#27CD97] p-4 text-white">
      <div class="relative shrink-0">
        <img src={props.gift.product.image} alt="" class="size-12 rounded-media border-2 border-white/70 bg-white object-cover" />
        <span class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-pill bg-white text-[#7650FF]">
          <GiftIcon class="size-3.5" />
        </span>
      </div>

      <Show
        when={!props.gift.unlocked}
        fallback={
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <p class="min-w-0 flex-1 text-sm font-semibold leading-[1.75]">
              คุณได้รับของแถมฟรีแล้ว! <span class="font-normal">{props.gift.product.name}</span>
            </p>
            <CheckBadge class="size-6 bg-white !text-[#27CD97]" />
          </div>
        }
      >
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p class="text-sm font-semibold leading-[1.75]">
              ซื้อเพิ่มอีก {formatTHB(props.gift.remaining)} รับฟรีสินค้าทันที!
            </p>
            <Show when={props.showAmounts}>
              <p class="text-sm">
                ยอดในตะกร้า {formatTHB(props.total)} / ขั้นต่ำ {formatTHB(props.gift.threshold)}
              </p>
            </Show>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-pill bg-white/30">
            <div class="h-full rounded-pill bg-white transition-[width] duration-300" style={{ width: `${progress()}%` }} />
          </div>
        </div>
      </Show>
    </div>
  );
}
