import { createEffect, on, onCleanup, Show } from "solid-js";
import { confettiBurst } from "~/lib/confetti";
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
/**
 * Celebration — once per unlock. The first time the shopper sees the banner
 * unlocked (mini cart or Cart page) it pops and shoots confetti; reopening
 * the cart later doesn't repeat it. Only after the cart falls back under the
 * threshold (removing items, lowering a quantity, an order clearing the cart)
 * and qualifies again does it celebrate once more. A different promotion
 * (other gift / threshold) has its own key, so a new promo celebrates too.
 * Remembered in localStorage so a reload with the same qualifying cart stays quiet.
 */
const CELEBRATED_KEY = "charmiss:gift-promo-celebrated";
const promoKey = (gift: GiftPromotionState) => `${gift.product.id}@${gift.threshold}`;
const wasCelebrated = (gift: GiftPromotionState) => {
  try {
    return localStorage.getItem(CELEBRATED_KEY) === promoKey(gift);
  } catch {
    return false;
  }
};
const markCelebrated = (gift: GiftPromotionState) => {
  try {
    localStorage.setItem(CELEBRATED_KEY, promoKey(gift));
  } catch {}
};

/**
 * Re-arms the celebration when the cart drops from unlocked to locked. Call it
 * from somewhere that's always mounted (CartDrawer's component body), so a
 * drop that happens while no banner is on screen still counts. Only a real
 * unlocked → locked change clears it — never the empty cart a page starts
 * with before the saved cart loads.
 */
export function rearmGiftCelebration(unlocked: () => boolean | undefined) {
  createEffect(
    on(unlocked, (now, prev) => {
      if (prev === true && now === false) {
        try {
          localStorage.removeItem(CELEBRATED_KEY);
        } catch {}
      }
    }),
  );
}

export function GiftPromotionBanner(props: { gift: GiftPromotionState; total: number; showAmounts?: boolean }) {
  const progress = () => Math.min(100, (props.total / props.gift.threshold) * 100);
  let bannerRef: HTMLDivElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  createEffect(
    on(
      () => props.gift.unlocked,
      (unlocked) => {
        if (!unlocked || wasCelebrated(props.gift)) return;
        // Let the mini cart finish sliding in before celebrating.
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!bannerRef?.isConnected || wasCelebrated(props.gift)) return;
          markCelebrated(props.gift);
          if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            bannerRef.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 450, easing: "ease-out" });
          }
          confettiBurst(bannerRef);
        }, 350);
      },
    ),
  );

  return (
    <div ref={bannerRef} class="flex items-center gap-3 rounded-card bg-gradient-to-r from-[#7650FF] to-[#27CD97] p-4 text-white">
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
            <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75]">
              <p class="font-semibold">คุณได้รับของแถมฟรีแล้ว!</p>
              {/* Gift name on its own line, one line max — "…" when it's longer. */}
              <p class="truncate" title={props.gift.product.name}>
                {props.gift.product.name}
              </p>
            </div>
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
