import { createSignal, For, Show, splitProps, type JSX } from "solid-js";
import type { ResolvedCartLine, CheckoutTotals, Coupon, GiftPromotionState } from "~/lib/cartSelectors";
import { AVAILABLE_COUPONS, MOCK_COIN_BALANCE, MAX_COIN_REDEMPTION } from "~/lib/cartSelectors";
import { formatTHB } from "../shared/PriceDisplay";
import { clientOnly } from "@solidjs/start";

// Same Kobalte Dialog SSR/hydration issue as ProductCard's QuickAddSheet — mount the modal on the client only.
const CouponPickerSheet = clientOnly(() => import("./CouponPickerSheet").then((m) => ({ default: m.CouponPickerSheet })));

/**
 * Figma's coupon UI is a picker over a short list of already-available
 * coupons ("เลือกคูปองส่วนลด" / "ใช้ได้ 3 คูปอง"), not a type-in code field —
 * followed here over the generic "กรอกโค้ดส่วนลด" example in the brief,
 * since Figma is the visual source of truth when the two disagree. Same for
 * "Charmiss Coin": no loyalty-points backend exists anywhere in this
 * project, so the balance is mock data (documented in cartSelectors.ts)
 * with a real redeem/un-redeem toggle wired into the same totals Cart Page
 * and the Drawer already share.
 */
export function CheckoutOrderSummary(props: {
  lines: ResolvedCartLine[];
  /** Unlocked free gift only — shown as a ฿0 line, never added to the totals. */
  gift?: GiftPromotionState;
  totals: CheckoutTotals;
  coupon: Coupon | undefined;
  onApplyCoupon: (coupon: Coupon) => void;
  onRemoveCoupon: () => void;
  coinsRedeemed: number;
  onToggleCoins: () => void;
}) {
  // Collapsed by default — the item list opens from the header.
  const [itemsExpanded, setItemsExpanded] = createSignal(false);
  const [couponPickerOpen, setCouponPickerOpen] = createSignal(false);

  return (
    <div class="flex w-full flex-col rounded-card border border-surface-gray bg-white lg:sticky lg:top-6 lg:w-[390px] lg:shrink-0">
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
          <ChevronIcon class={itemsExpanded() ? "rotate-180" : ""} />
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
                  <p class="text-xs text-ink-gray">
                    {variant ? `ตัวเลือกสินค้า ${variant.label} · ` : ""}x{line.qty}
                  </p>
                </div>
                <p class="shrink-0 text-base font-semibold text-ink">{formatTHB(unitPrice * line.qty)}</p>
              </li>
            )}
          </For>
          <Show when={props.gift}>
            {(g) => (
              <li class="flex list-none items-center gap-2">
                <img
                  src={g().product.image}
                  alt={g().product.name}
                  loading="lazy"
                  class="size-[66px] shrink-0 rounded-media border border-surface-gray object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{g().product.name}</p>
                  <p class="text-xs text-ink-gray">ของแถมฟรี · x{g().qty}</p>
                </div>
                <p class="shrink-0 text-base font-semibold text-system-red">ฟรี</p>
              </li>
            )}
          </Show>
        </ul>
      </Show>

      <div class="relative flex flex-col gap-3 overflow-hidden rounded-t-card bg-gradient-to-b from-brand-purple to-[#8462ff] p-4">
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
          <PerkButton tone="pink" onClick={() => setCouponPickerOpen(true)} aria-haspopup="dialog">
            {props.coupon ? "เปลี่ยนคูปอง" : "เลือกคูปอง"}
          </PerkButton>
        </div>
        <CouponPickerSheet
          open={couponPickerOpen()}
          onOpenChange={setCouponPickerOpen}
          coupons={AVAILABLE_COUPONS}
          subtotal={props.totals.subtotal}
          applied={props.coupon}
          onApply={props.onApplyCoupon}
          onRemove={props.onRemoveCoupon}
        />

        <div class="flex items-center gap-2">
          <div class="h-px flex-1 bg-white/40" />
          <p class="text-xs text-white">ใช้คะแนนแลกส่วนลด</p>
          <div class="h-px flex-1 bg-white/40" />
        </div>

        {/* Both perk rows: 12px padding / 6px gaps / 28px icons below `sm` so "Charmiss Coin" + its pill fit a 360px phone. */}
        <div class="flex items-center justify-between gap-1.5 rounded-card bg-[#fff4e6] p-3 sm:gap-2 sm:p-4">
          <div class="flex items-center gap-1.5 sm:gap-2">
            <CoinIcon />
            <div>
              <p class="whitespace-nowrap text-sm font-semibold text-ink">Charmiss Coin</p>
              <p class="text-xs text-ink-gray">คุณมี {MOCK_COIN_BALANCE.toLocaleString("th-TH")} คอยน์</p>
            </div>
          </div>
          <PerkButton onClick={props.onToggleCoins} aria-pressed={props.coinsRedeemed > 0} active={props.coinsRedeemed > 0}>
            {props.coinsRedeemed > 0
              ? "ยกเลิกการใช้คอยน์"
              : `ใช้ ${MAX_COIN_REDEMPTION} คอยน์ ลด ฿${Math.round(MAX_COIN_REDEMPTION * 0.1).toLocaleString("th-TH")}`}
          </PerkButton>
        </div>
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
            <span class="text-ink-gray">Charmiss Coin</span>
            <span class="font-bold text-success">-{formatTHB(props.totals.coinDiscount)}</span>
          </div>
        </Show>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ค่าจัดส่ง</span>
          <span class="font-bold" classList={{ "text-success": props.totals.shippingFee === 0, "text-ink": props.totals.shippingFee > 0 }}>
            {props.totals.shippingFee === 0 ? "ฟรี" : formatTHB(props.totals.shippingFee)}
          </span>
        </div>
        <Show when={props.totals.couponDiscount + props.totals.coinDiscount > 0}>
          <div class="flex items-center gap-2 rounded-card bg-success-soft px-3 py-2 text-xs font-medium text-success">
            <CheckIcon /> คุณประหยัดไป {formatTHB(props.totals.couponDiscount + props.totals.coinDiscount)} จากออเดอร์นี้
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
 * The pill used by both perk rows — one definition so they always match in
 * size/shape; only the color differs: coupons pink (`tone="pink"`), Charmiss
 * Coin yellow (default). `active` = the perk is in use (gray, "cancel").
 */
function PerkButton(
  props: { children: JSX.Element; onClick: () => void; active?: boolean; tone?: "yellow" | "pink" } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">,
) {
  const [local, rest] = splitProps(props, ["children", "onClick", "active", "tone"]);
  return (
    <button
      type="button"
      {...rest}
      onClick={local.onClick}
      class="shrink-0 whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 sm:px-4"
      classList={{
        "bg-system-yellow": !local.active && local.tone !== "pink",
        "bg-brand-pink": !local.active && local.tone === "pink",
        "bg-ink-gray": !!local.active,
      }}
    >
      {local.children}
    </button>
  );
}

function ChevronIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={`size-4 shrink-0 transition-transform duration-200 ${props.class ?? ""}`} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
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
function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-7 shrink-0 text-system-yellow sm:size-8" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" text-anchor="middle" font-size="11" fill="white" font-weight="bold">
        C
      </text>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
