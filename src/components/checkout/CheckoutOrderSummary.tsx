import { createSignal, For, Show, splitProps, type JSX } from "solid-js";
import type { ResolvedCartLine, CheckoutTotals, Coupon } from "~/lib/cartSelectors";
import type { GiftLine } from "~/lib/promotionEngine";
import { MOCK_COIN_BALANCE, SHIPPING_FEE } from "~/lib/cartSelectors";
import { useStorefrontPromotions } from "~/lib/storefrontPromotions";
import { formatTHB } from "../shared/PriceDisplay";
import { ChevronIcon } from "../shared/ChevronIcon";
import { CheckIcon } from "../shared/icons";
import coinMark from "~/assets/icons/charmiss-coin.png";
import blurShape from "~/assets/images/coupon/blur-shape.png";
import ticketDeco1 from "~/assets/images/coupon/coupon-ticket-deco-1.svg";
import ticketDeco2 from "~/assets/images/coupon/coupon-ticket-deco-2.svg";
import ticketDeco3 from "~/assets/images/coupon/coupon-ticket-deco-3.svg";
import { clientOnly } from "@solidjs/start";

// Same Kobalte Dialog SSR/hydration issue as ProductCard's QuickAddSheet — mount the modal on the client only.
const CouponPickerSheet = clientOnly(() => import("./CouponPickerSheet").then((m) => ({ default: m.CouponPickerSheet })));
const CoinRedeemSheet = clientOnly(() => import("./CoinRedeemSheet").then((m) => ({ default: m.CoinRedeemSheet })));

/**
 * Figma's coupon UI is a picker over a short list of already-available
 * coupons ("เลือกคูปองส่วนลด" / "ใช้ได้ 3 คูปอง"), not a type-in code field —
 * followed here over the generic "กรอกโค้ดส่วนลด" example in the brief,
 * since Figma is the visual source of truth when the two disagree. Same for
 * "Charmiss Coin": no loyalty-points backend exists anywhere in this
 * project, so the balance is mock data (documented in cartSelectors.ts)
 * with a real redeem sheet (`CoinRedeemSheet` — pick the amount) wired into
 * the same totals Cart Page and the Drawer already share.
 */
export function CheckoutOrderSummary(props: {
  lines: ResolvedCartLine[];
  /** Unlocked free gifts (one per unlocked tier of every active gift promo), shown as ฿0 lines, never added to the totals. */
  gifts: GiftLine[];
  totals: CheckoutTotals;
  coupon: Coupon | undefined;
  onApplyCoupon: (coupon: Coupon) => void;
  onRemoveCoupon: () => void;
  /** How many of this shopper's own orders used a code (coupon "จำกัดต่อลูกค้า"); 0 for a guest. */
  couponUsesByShopper?: (code: string) => number;
  coinsRedeemed: number;
  /** Most coins this order can take (`maxRedeemableCoins`). */
  maxCoins: number;
  onApplyCoins: (coins: number) => void;
}) {
  // Collapsed by default — the item list opens from the header.
  const [itemsExpanded, setItemsExpanded] = createSignal(false);
  const [couponPickerOpen, setCouponPickerOpen] = createSignal(false);
  // Coupons come from Admin (Marketing > คูปอง): the listed ones, plus every switched-on code for typing in.
  const storeCoupons = useStorefrontPromotions();
  const [coinSheetOpen, setCoinSheetOpen] = createSignal(false);

  return (
    <div class="flex w-full flex-col rounded-card border border-surface-gray bg-white lg:sticky lg:top-6 lg:w-[clamp(390px,44%,560px)] lg:shrink-0">
      {/* The left column's wrapper (checkout.tsx) uses `p-4 lg:p-6` directly
          on its own outer edge with no border; this card's outer edge has a
          1px border instead, and this button (not the card root) is what
          carries the padding — so it needs the identical `lg:p-6` step to
          keep both columns' headings top-aligned at `lg` and up. */}
      <button
        type="button"
        onClick={() => setItemsExpanded((v) => !v)}
        aria-expanded={itemsExpanded()}
        class="font-normal flex items-center justify-between px-4 pb-4 pt-4 lg:pt-6 text-left"
      >
        <p class="text-lg font-semibold text-ink">สรุปคำสั่งซื้อ</p>
        <span class="flex items-center gap-1 text-sm font-semibold text-ink">
          สินค้าทั้งหมด {props.lines.reduce((n, l) => n + l.line.qty, 0)} ชิ้น
          <ChevronIcon direction={itemsExpanded() ? "up" : "down"} class="size-5 transition-transform duration-200" />
        </span>
      </button>
      <div class="h-px bg-surface-gray" />

      <Show when={itemsExpanded()}>
        <ul class="flex flex-col gap-4 p-4">
          <For each={props.lines}>
            {({ line, product, variant, unitPrice }) => (
              <li class="flex list-none items-center gap-2">
                <img
                  src={variant?.image ?? product.image}
                  alt={product.name}
                  loading="lazy"
                  class="size-[66px] shrink-0 rounded-media border border-surface-gray object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{product.name}</p>
                  <p class="flex flex-wrap gap-x-2 text-xs text-ink-gray">
                    {variant && <span>ตัวเลือกสินค้า {variant.label}</span>}
                    <span>x{line.qty}</span>
                  </p>
                </div>
                <p class="shrink-0 text-base font-semibold text-ink">{formatTHB(unitPrice * line.qty)}</p>
              </li>
            )}
          </For>
          <For each={props.gifts}>
            {(g) => (
              <li class="flex list-none items-center gap-2">
                <img
                  src={g.product.image}
                  alt={g.product.name}
                  loading="lazy"
                  class="size-[66px] shrink-0 rounded-media border border-surface-gray object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{g.product.name}</p>
                  <p class="text-xs text-ink-gray">ของแถมฟรี x{g.qty}</p>
                </div>
                <p class="shrink-0 text-base font-semibold text-system-red">ฟรี</p>
              </li>
            )}
          </For>
        </ul>
      </Show>

      {/* `isolate` + `-z-10` decos: the Home coupon section's yellow light shapes and floating tickets (same assets)
          paint above this gradient but under every row, text and button; clipped by the box, smaller on phones. */}
      <div class="relative isolate flex flex-col gap-3 overflow-hidden rounded-t-card bg-gradient-to-b from-brand-purple to-[#8462ff] p-4">
        <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
          <img src={blurShape} alt="" class="absolute -left-16 -top-24 h-52 w-auto max-w-none -rotate-[60deg] opacity-60 blur-[6px] sm:-left-14 sm:h-60" />
          <img src={blurShape} alt="" class="absolute -bottom-28 -right-16 h-52 w-auto max-w-none rotate-[120deg] opacity-50 blur-[6px] sm:h-60" />
          <img src={ticketDeco2} alt="" class="absolute -left-4 top-3 w-14 -rotate-12 sm:w-16" />
          <img src={ticketDeco3} alt="" class="absolute -right-4 top-2 w-14 -scale-y-100 rotate-[-172deg] sm:w-16" />
          <img src={ticketDeco1} alt="" class="absolute -right-5 bottom-10 w-12 rotate-12 opacity-80 blur-[3px] sm:w-14" />
        </div>
        <p class="text-center text-lg font-semibold text-white">ส่วนลดและสิทธิพิเศษ</p>

        {/* Same row pattern + pill button as the Charmiss Coin row below; the button opens the coupon modal. */}
        <div class="flex items-center justify-between gap-1.5 rounded-card bg-white p-3 sm:gap-2 sm:p-4">
          <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink sm:size-8" aria-hidden="true">
              <TagIcon />
            </span>
            <div class="min-w-0">
              <p class="whitespace-nowrap text-sm font-semibold text-ink">คูปองส่วนลด</p>
              <p class="text-xs text-ink-gray">{props.coupon ? `ใช้คูปอง ${props.coupon.label} อยู่` : "เลือกคูปองเพื่อรับส่วนลด"}</p>
            </div>
          </div>
          <PerkButton onClick={() => setCouponPickerOpen(true)} aria-haspopup="dialog">
            {props.coupon ? "เปลี่ยนคูปอง" : "เลือกคูปอง"}
          </PerkButton>
        </div>
        <CouponPickerSheet
          open={couponPickerOpen()}
          onOpenChange={setCouponPickerOpen}
          coupons={storeCoupons.checkoutCoupons()}
          codeCoupons={storeCoupons.codeCoupons()}
          subtotal={props.totals.subtotal}
          usedByShopper={props.couponUsesByShopper}
          applied={props.coupon}
          onApply={props.onApplyCoupon}
          onRemove={props.onRemoveCoupon}
        />

        <div class="flex items-center gap-2">
          <div class="h-px flex-1 bg-white/40" />
          <p class="text-xs text-white">ใช้คะแนนแลกส่วนลด</p>
          <div class="h-px flex-1 bg-white/40" />
        </div>

        {/* Both perk rows: 12px padding / 6px gaps / 28px icons below `sm` so "Charmiss Coin" + its pill fit a 360px phone.
            The coin row is the coupon row's pink (pink tint, pink pill) with the real coin artwork. */}
        <div class="flex items-center justify-between gap-1.5 rounded-card bg-surface-pink p-3 sm:gap-2 sm:p-4">
          <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <img src={coinMark} alt="" class="size-7 shrink-0 sm:size-8" aria-hidden="true" />
            <div class="min-w-0">
              <p class="whitespace-nowrap text-sm font-semibold text-ink">Charmiss Coin</p>
              <p class="text-xs text-ink-gray">
                {props.coinsRedeemed > 0
                  ? `ใช้ ${props.coinsRedeemed.toLocaleString("th-TH")} คอยน์ ลด ${formatTHB(props.totals.coinDiscount)}`
                  : `คุณมี ${MOCK_COIN_BALANCE.toLocaleString("th-TH")} คอยน์`}
              </p>
            </div>
          </div>
          {/* Same 14px as the row's "Charmiss Coin" / "คูปองส่วนลด" label; opens the amount picker. */}
          <PerkButton onClick={() => setCoinSheetOpen(true)} aria-haspopup="dialog">
            {props.coinsRedeemed > 0 ? "แก้ไขคอยน์" : "ใช้คอยน์"}
          </PerkButton>
        </div>
        <CoinRedeemSheet
          open={coinSheetOpen()}
          onOpenChange={setCoinSheetOpen}
          balance={MOCK_COIN_BALANCE}
          max={props.maxCoins}
          applied={props.coinsRedeemed}
          onApply={props.onApplyCoins}
        />
      </div>

      <div class="h-px bg-surface-gray" />
      <div class="flex flex-col gap-2 p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ยอดรวมสินค้า</span>
          <span class="font-bold text-ink">{formatTHB(props.totals.subtotal)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ส่วนลด</span>
          <span class="font-bold text-ink">{props.totals.couponDiscount > 0 ? `-${formatTHB(props.totals.couponDiscount)}` : formatTHB(0)}</span>
        </div>
        <Show when={props.totals.coinDiscount > 0}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">Charmiss Coin ({props.coinsRedeemed.toLocaleString("th-TH")} คอยน์)</span>
            <span class="font-bold text-success">-{formatTHB(props.totals.coinDiscount)}</span>
          </div>
        </Show>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ค่าจัดส่ง</span>
          {/* Struck ฿60.00 + "ส่งฟรี" once `computeShippingFee` → 0 (the DHL box shows carrier + ETA only). */}
          <Show when={props.totals.shippingFee === 0} fallback={<span class="font-bold text-ink">{formatTHB(props.totals.shippingFee)}</span>}>
            <span class="flex items-baseline gap-1.5">
              <span class="text-xs text-ink-gray line-through">{formatTHB(SHIPPING_FEE)}</span>
              <span class="font-bold text-success">ส่งฟรี</span>
            </span>
          </Show>
        </div>
        <Show when={props.totals.couponDiscount + props.totals.coinDiscount > 0}>
          <div class="flex items-center gap-2 rounded-card bg-success-soft px-3 py-2 text-xs font-medium text-success">
            <CheckIcon class="size-4 shrink-0" /> คุณประหยัดไป {formatTHB(props.totals.couponDiscount + props.totals.coinDiscount)} จากออเดอร์นี้
          </div>
        </Show>
      </div>

      <div class="mx-4 h-px bg-surface-gray" />
      <div class="flex flex-col gap-2 p-4">
        <div class="flex items-center justify-between">
          <span class="text-lg font-semibold text-ink">ยอดชำระทั้งหมด</span>
          <span class="text-2xl font-bold text-brand-pink">{formatTHB(props.totals.total)}</span>
        </div>

        {/* No pay button here — it ends the payment form (one-page checkout). */}
      </div>
    </div>
  );
}

/**
 * The pill used by both perk rows (coupon, Charmiss Coin) — one definition so
 * they always match: brand pink, 14px (`text-sm`, the rows' own label size).
 * `active` = the perk is in use (gray, "cancel").
 */
function PerkButton(
  props: { children: JSX.Element; onClick: () => void; active?: boolean } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">,
) {
  const [local, rest] = splitProps(props, ["children", "onClick", "active"]);
  return (
    <button
      type="button"
      {...rest}
      onClick={local.onClick}
      class="min-h-9 shrink-0 whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 sm:px-4"
      classList={{
        "bg-brand-pink lg:hover:bg-brand-pink/90": !local.active,
        "bg-ink-gray": !!local.active,
      }}
    >
      {local.children}
    </button>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l3.59-3.59a2 2 0 0 0 0-2.59Z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
