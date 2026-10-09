import { createMemo, For, Show } from "solid-js";
import {
  formatPromoShort,
  formatPromoValue,
  type FreeShippingState,
  type GiftPromotionState,
  type GiftTierState,
} from "~/lib/promotionEngine";
import { createPromoCelebration, freeShippingKey, giftTierKey, type CelebrationTarget } from "~/lib/promoCelebration";
import { CheckBadge, CheckIcon, GiftIcon, TruckIcon } from "./icons";

/**
 * Cart promo banners (Cart Drawer + Cart Page). Each promo Admin switched
 * on with "แสดงในตะกร้า" gets its own banner: free shipping and every gift
 * promo are separate cards, never merged. All share the CI purple to green
 * gradient and the pop + confetti on unlock (`createPromoCelebration`).
 * `showAmounts` is the Cart Page's roomier layout (amount line, tier labels
 * and the tier list); the Drawer gets the compact one.
 */
export function CartPromoBanners(props: { freeShipping?: FreeShippingState; gifts: GiftPromotionState[]; showAmounts?: boolean }) {
  const visibleGifts = createMemo(() => props.gifts.filter((g) => g.showInCart));
  return (
    <>
      <For each={visibleGifts()}>
        {(gift) => (
          <Show when={gift.tiers.length > 1} fallback={<GiftPromotionBanner gift={gift} showAmounts={props.showAmounts} />}>
            <TieredGiftBanner gift={gift} showAmounts={props.showAmounts} />
          </Show>
        )}
      </For>
      <Show when={props.freeShipping?.showInCart && props.freeShipping}>{(s) => <FreeShippingBanner state={s()} showAmounts={props.showAmounts} />}</Show>
    </>
  );
}

/** Every unlock the cart can celebrate, for `rearmPromoCelebrations`. */
export function promoCelebrationTargets(freeShipping: FreeShippingState | undefined, gifts: GiftPromotionState[]): CelebrationTarget[] {
  const ship = freeShipping ? [{ key: freeShippingKey(freeShipping), unlocked: freeShipping.unlocked }] : [];
  return [...ship, ...gifts.flatMap((g) => g.tiers.map((t) => ({ key: giftTierKey(g.id, t, g.unit), unlocked: t.unlocked })))];
}

const CARD = "rounded-card bg-gradient-to-r from-[#7650FF] to-[#27CD97] p-4 text-white";

function ProgressBar(props: { percent: number }) {
  return (
    <div class="h-1.5 w-full overflow-hidden rounded-pill bg-white/30">
      <div class="h-full rounded-pill bg-white transition-[width] duration-300" style={{ width: `${Math.min(100, props.percent)}%` }} />
    </div>
  );
}

/** "ยอดในตะกร้า ฿X / ขั้นต่ำ ฿Y" or "สินค้าในตะกร้า X ชิ้น / ขั้นต่ำ Y ชิ้น". */
function AmountLine(props: { unit: "amount" | "qty"; current: number; target: number }) {
  return (
    <p class="text-sm">
      {props.unit === "qty" ? "สินค้าในตะกร้า" : "ยอดในตะกร้า"} {formatPromoValue(props.unit, props.current)} / ขั้นต่ำ {formatPromoValue(props.unit, props.target)}
    </p>
  );
}

export function FreeShippingBanner(props: { state: FreeShippingState; showAmounts?: boolean }) {
  let ref: HTMLDivElement | undefined;
  createPromoCelebration(() => ref, () => [{ key: freeShippingKey(props.state), unlocked: props.state.unlocked }]);
  const percent = () => (props.state.threshold > 0 ? (props.state.current / props.state.threshold) * 100 : 100);

  return (
    <div ref={ref} class={`flex items-center gap-3 ${CARD}`}>
      <span class="flex size-12 shrink-0 items-center justify-center rounded-media border-2 border-white/70 bg-white text-[#7650FF]">
        <TruckIcon class="size-7" />
      </span>
      <Show
        when={!props.state.unlocked}
        fallback={
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75]">
              <p class="font-semibold">คุณได้รับสิทธิ์จัดส่งฟรีแล้ว!</p>
              <p class="truncate">ไม่มีค่าจัดส่งสำหรับคำสั่งซื้อนี้</p>
            </div>
            <CheckBadge class="size-6 bg-white !text-[#27CD97]" />
          </div>
        }
      >
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p class="text-sm font-semibold leading-[1.75]">ซื้อเพิ่มอีก {formatPromoValue(props.state.unit, props.state.remaining)} รับส่งฟรีทันที!</p>
            <Show when={props.showAmounts}>
              <AmountLine unit={props.state.unit} current={props.state.current} target={props.state.threshold} />
            </Show>
          </div>
          <ProgressBar percent={percent()} />
        </div>
      </Show>
    </div>
  );
}

/** One-tier gift promo ("ซื้อครบ ฿X รับฟรีสินค้า Y"): the gift's photo on the left so the shopper sees what they're working toward. */
export function GiftPromotionBanner(props: { gift: GiftPromotionState; showAmounts?: boolean }) {
  let ref: HTMLDivElement | undefined;
  const tier = () => props.gift.tiers[0];
  createPromoCelebration(() => ref, () => [{ key: giftTierKey(props.gift.id, tier(), props.gift.unit), unlocked: tier().unlocked }]);

  return (
    <div ref={ref} class={`flex items-center gap-3 ${CARD}`}>
      <GiftThumb tier={tier()} />
      <Show
        when={!tier().unlocked}
        fallback={
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75]">
              <p class="font-semibold">คุณได้รับของแถมฟรีแล้ว!</p>
              {/* Gift name on its own line, one line max, "..." when it's longer. */}
              <p class="truncate" title={tier().product.name}>
                {tier().product.name}
              </p>
            </div>
            <CheckBadge class="size-6 bg-white !text-[#27CD97]" />
          </div>
        }
      >
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p class="text-sm font-semibold leading-[1.75]">ซื้อเพิ่มอีก {formatPromoValue(props.gift.unit, tier().remaining)} รับฟรีสินค้าทันที!</p>
            <Show when={props.showAmounts}>
              <AmountLine unit={props.gift.unit} current={props.gift.current} target={tier().threshold} />
            </Show>
          </div>
          <ProgressBar percent={(props.gift.current / tier().threshold) * 100} />
        </div>
      </Show>
    </div>
  );
}

function GiftThumb(props: { tier: GiftTierState }) {
  return (
    <div class="relative shrink-0">
      <img src={props.tier.product.image} alt="" class="size-12 rounded-media border-2 border-white/70 bg-white object-cover" />
      <span class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-pill bg-white text-[#7650FF]">
        <GiftIcon class="size-3.5" />
      </span>
    </div>
  );
}

/**
 * ขั้นบันได (2 to 5 tiers): the next tier leads ("ซื้อเพิ่มอีก ฿X รับของแถม
 * ขั้นที่ N"), one bar with a milestone per tier. Milestones sit evenly
 * spaced, not by amount, so ฿590 and ฿3,500 tiers stay readable side by
 * side. Gifts are cumulative: every tier reached adds its gift.
 */
export function TieredGiftBanner(props: { gift: GiftPromotionState; showAmounts?: boolean }) {
  let ref: HTMLDivElement | undefined;
  createPromoCelebration(
    () => ref,
    () => props.gift.tiers.map((t) => ({ key: giftTierKey(props.gift.id, t, props.gift.unit), unlocked: t.unlocked })),
  );

  const count = () => props.gift.tiers.length;
  const position = (i: number) => ((i + 1) / count()) * 100;
  // Fill grows segment by segment between evenly spaced milestones.
  const percent = createMemo(() => {
    const tiers = props.gift.tiers;
    const k = tiers.findIndex((t) => !t.unlocked);
    if (k === -1) return 100;
    const prev = k === 0 ? 0 : tiers[k - 1].threshold;
    const frac = Math.max(0, Math.min(1, (props.gift.current - prev) / (tiers[k].threshold - prev)));
    return ((k + frac) / tiers.length) * 100;
  });
  const lead = () => props.gift.nextTier ?? props.gift.tiers[props.gift.tiers.length - 1];

  return (
    <div ref={ref} class={`flex flex-col gap-3 ${CARD}`}>
      <div class="flex items-center gap-3">
        <GiftThumb tier={lead()} />
        <Show
          when={props.gift.nextTier}
          fallback={
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75]">
                <p class="font-semibold">คุณได้รับของแถมครบทั้ง {count()} ขั้นแล้ว!</p>
                <p class="truncate">ของแถมทั้งหมดอยู่ในตะกร้าของคุณ</p>
              </div>
              <CheckBadge class="size-6 bg-white !text-[#27CD97]" />
            </div>
          }
        >
          {(next) => (
            <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75]">
              <p class="font-semibold">
                ซื้อเพิ่มอีก {formatPromoValue(props.gift.unit, next().remaining)} รับของแถมขั้นที่ {next().index + 1}
              </p>
              <p class="truncate" title={next().product.name}>
                {next().product.name}
              </p>
            </div>
          )}
        </Show>
      </div>

      {/* Milestone track: inset by half a marker so the first/last markers stay inside the card. */}
      <div class="px-3">
        <div class="relative h-6">
          <div class="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <ProgressBar percent={percent()} />
          </div>
          <For each={props.gift.tiers}>
            {(tier) => (
              <span
                class="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill transition-colors duration-300"
                classList={{
                  "border-2 border-white bg-[#27CD97] text-white": tier.unlocked,
                  "bg-white text-[#7650FF]": !tier.unlocked,
                }}
                style={{ left: `${position(tier.index)}%` }}
                aria-hidden="true"
              >
                <Show when={tier.unlocked} fallback={<GiftIcon class="size-3.5" />}>
                  <CheckIcon class="size-3.5" />
                </Show>
              </span>
            )}
          </For>
        </div>
        <Show when={props.showAmounts}>
          <div class="relative mt-1 h-5">
            <For each={props.gift.tiers}>
              {(tier) => (
                <span class="absolute -translate-x-1/2 whitespace-nowrap text-xs font-medium" style={{ left: `${position(tier.index)}%` }}>
                  {formatPromoShort(props.gift.unit, tier.threshold)}
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>

      <Show
        when={props.showAmounts}
        fallback={
          <p class="text-xs leading-[1.75] text-white/90">
            ได้รับแล้ว {props.gift.unlockedCount} จาก {count()} ขั้น
          </p>
        }
      >
        <ul class="grid grid-cols-1 gap-2 lg:grid-cols-5">
          <For each={props.gift.tiers}>
            {(tier) => (
              <li class="flex min-w-0 items-center gap-3 rounded-media bg-white/15 p-2 lg:flex-col lg:items-start lg:gap-2">
                <img src={tier.product.image} alt="" class="size-10 shrink-0 rounded-media bg-white object-cover" />
                <div class="flex min-w-0 flex-1 flex-col text-sm leading-[1.75] lg:w-full">
                  <span class="text-xs text-white/90">
                    ขั้นที่ {tier.index + 1} ซื้อครบ {formatPromoShort(props.gift.unit, tier.threshold)}
                  </span>
                  <span class="truncate font-medium" title={tier.product.name}>
                    {tier.product.name}
                  </span>
                </div>
                <span class="shrink-0 text-xs font-semibold">
                  <Show when={tier.unlocked} fallback={<>อีก {formatPromoValue(props.gift.unit, tier.remaining)}</>}>
                    <span class="inline-flex items-center gap-1">
                      <CheckIcon class="size-3.5" /> ได้รับแล้ว
                    </span>
                  </Show>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
