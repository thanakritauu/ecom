import { createSignal, For, Show } from "solid-js";
import type { ResolvedCartLine, CheckoutTotals, Coupon } from "~/lib/cartSelectors";
import { AVAILABLE_COUPONS, MOCK_COIN_BALANCE, MAX_COIN_REDEMPTION } from "~/lib/cartSelectors";
import { formatTHB } from "../shared/PriceDisplay";
import { Button } from "../shared/Button";

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
  totals: CheckoutTotals;
  coupon: Coupon | undefined;
  onApplyCoupon: (coupon: Coupon) => void;
  onRemoveCoupon: () => void;
  coinsRedeemed: number;
  onToggleCoins: () => void;
  onSubmit: () => void;
  submitStatus: "idle" | "loading" | "error";
  submitError?: string;
  disabled?: boolean;
  submitLabel?: string;
}) {
  const [itemsExpanded, setItemsExpanded] = createSignal(true);
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
        </ul>
      </Show>

      <div class="relative flex flex-col gap-3 overflow-hidden rounded-t-card bg-gradient-to-b from-brand-purple to-[#8462ff] p-4">
        <p class="text-center text-lg font-semibold text-white">ส่วนลดและสิทธิพิเศษ</p>

        <Show when={couponPickerOpen()} fallback={
          <button
            type="button"
            onClick={() => setCouponPickerOpen(true)}
            class="flex items-center justify-between rounded-card border border-dashed border-brand-pink bg-white p-4"
          >
            <span class="flex items-center gap-2 text-sm font-medium text-brand-pink">
              <TagIcon /> {props.coupon ? `ใช้คูปอง ${props.coupon.code}` : "เลือกคูปองส่วนลด"}
            </span>
            <span class="text-xs font-medium text-brand-pink underline">ใช้ได้ {AVAILABLE_COUPONS.length} คูปอง</span>
          </button>
        }>
          <div class="flex flex-col gap-2 rounded-card bg-white p-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-ink">เลือกคูปอง</p>
              <button type="button" onClick={() => setCouponPickerOpen(false)} class="text-xs text-ink-gray underline">
                ปิด
              </button>
            </div>
            <For each={AVAILABLE_COUPONS}>
              {(coupon) => {
                const eligible = () => props.totals.subtotal >= coupon.minSpend;
                const active = () => props.coupon?.code === coupon.code;
                return (
                  <div class="flex items-center justify-between gap-2 rounded-card border border-surface-gray p-3" classList={{ "opacity-50": !eligible() }}>
                    <div>
                      <p class="text-sm font-bold text-system-red">{coupon.label}</p>
                      <p class="text-xs text-ink-gray">
                        ขั้นต่ำ {formatTHB(coupon.minSpend)} · {coupon.expiresLabel}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={active() ? "outline" : "primary"}
                      size="sm"
                      disabled={!eligible()}
                      onClick={() => (active() ? props.onRemoveCoupon() : props.onApplyCoupon(coupon))}
                    >
                      {active() ? "ยกเลิก" : "ใช้เลย"}
                    </Button>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        <div class="flex items-center gap-2">
          <div class="h-px flex-1 bg-white/40" />
          <p class="text-xs text-white">ใช้คะแนนแลกส่วนลด</p>
          <div class="h-px flex-1 bg-white/40" />
        </div>

        <div class="flex items-center justify-between gap-2 rounded-card bg-[#fff4e6] p-4">
          <div class="flex items-center gap-2">
            <CoinIcon />
            <div>
              <p class="text-sm font-semibold text-ink">Charmiss Coin</p>
              <p class="text-xs text-ink-gray">คุณมี {MOCK_COIN_BALANCE.toLocaleString("th-TH")} คอยน์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onToggleCoins}
            aria-pressed={props.coinsRedeemed > 0}
            class="shrink-0 rounded-pill px-4 py-1.5 text-xs font-medium text-white transition-colors duration-150"
            classList={{ "bg-system-yellow": props.coinsRedeemed === 0, "bg-ink-gray": props.coinsRedeemed > 0 }}
          >
            {props.coinsRedeemed > 0
              ? "ยกเลิกการใช้คอยน์"
              : `ใช้ ${MAX_COIN_REDEMPTION} คอยน์ ลด ${formatTHB(Math.round(MAX_COIN_REDEMPTION * 0.1))}`}
          </button>
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

        <Show when={props.submitStatus === "error"}>
          <p class="text-sm text-system-red" role="alert">
            {props.submitError ?? "ไม่สามารถดำเนินการสั่งซื้อได้ กรุณาลองอีกครั้ง"}
          </p>
        </Show>

        <Button
          type="button"
          variant="primary"
          size="lg"
          class="w-full"
          loading={props.submitStatus === "loading"}
          disabled={props.disabled}
          onClick={props.onSubmit}
        >
          {props.submitStatus === "loading" ? "กำลังดำเนินการ..." : (props.submitLabel ?? "ยืนยันการชำระเงิน")}
        </Button>
        <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink-gray">
          <LockIcon /> ข้อมูลของคุณจะถูกเข้ารหัสและชำระเงินผ่านช่องทางที่ปลอดภัย
        </p>
      </div>
    </div>
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
    <svg viewBox="0 0 24 24" class="size-8 shrink-0 text-system-yellow" fill="currentColor" aria-hidden="true">
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
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
