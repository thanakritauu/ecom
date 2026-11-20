import { For, Show } from "solid-js";
import { isServer } from "solid-js/web";
import { Button } from "../shared/Button";
import { formatTHB } from "../shared/PriceDisplay";
import { METHOD_ICONS } from "./paymentMarks";
import type { PaidResult } from "./checkoutPayment";
import coinMark from "~/assets/icons/charmiss-coin.png";

/** What the success page shows: kept for this browser tab, so `/order-success/:id` survives a refresh. */
export type OrderSuccessData = { number: string; total: number; coinsEarned: number; payment: PaidResult };

const storageKey = (orderNumber: string) => `charmiss:order-success:${orderNumber}`;

/** Checkout saves the paid order here just before sending the shopper to `/order-success/:id`. */
export function saveOrderSuccess(data: OrderSuccessData) {
  try {
    sessionStorage.setItem(storageKey(data.number), JSON.stringify(data));
  } catch {
    // Storage unavailable: the success page shows its not-found card with links to the orders.
  }
}

export function readOrderSuccess(orderNumber: string): OrderSuccessData | undefined {
  if (isServer) return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey(orderNumber));
    return raw ? (JSON.parse(raw) as OrderSuccessData) : undefined;
  } catch {
    return undefined;
  }
}

/** "ชำระเงินสำเร็จ": order number, amount paid, payment method and the คะแนน it earns (members only). */
export function OrderSuccess(props: OrderSuccessData & { isMember: boolean }) {
  return (
    <div class="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center gap-4 rounded-card bg-white px-4 py-12 text-center shadow-card sm:py-16" role="status">
      {/* Pops in, a soft ring pulses out once, then the DSL tick draws itself (app.css `success-check-*`; still under reduced motion). */}
      <div class="relative flex size-16 items-center justify-center" aria-hidden="true">
        <span class="success-check-ring absolute inset-0 rounded-pill bg-success/30" />
        <span class="success-check-pop relative flex size-16 items-center justify-center rounded-pill bg-success text-white">
          <svg viewBox="0 0 16 16" fill="none" class="size-9">
            <path class="success-check-path" pathLength="1" d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
      <h1 class="text-2xl font-bold text-ink">ชำระเงินสำเร็จ</h1>
      <p class="text-ink-gray">ขอบคุณสำหรับคำสั่งซื้อของคุณ</p>
      <dl class="flex w-full max-w-sm flex-col gap-2 rounded-card bg-surface-gray/60 px-5 py-4 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">หมายเลขคำสั่งซื้อ</dt>
          <dd class="font-semibold text-ink">{props.number}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">ยอดชำระ</dt>
          <dd class="font-semibold text-brand-pink">{formatTHB(props.total)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-gray">ช่องทางชำระเงิน</dt>
          <dd class="flex flex-col items-end gap-1 text-right text-ink">
            {/* The method's own icons (same artwork as the payment picker), then its name. */}
            <span class="flex items-center gap-2">
              <span class="flex shrink-0 items-center -space-x-1.5">
                <For each={METHOD_ICONS[props.payment.method]}>
                  {(src) => <img src={src} alt="" class="size-6 rounded-md ring-2 ring-surface-gray" />}
                </For>
              </span>
              {props.payment.methodLabel}
            </span>
            <Show when={props.payment.detail}>
              <span class="block text-xs text-ink-gray">{props.payment.detail}</span>
            </Show>
          </dd>
        </div>
      </dl>
      {/* คะแนน Charmiss Club is a member-account balance (`auth.tsx`'s `User.coinBalance`)
          — a guest checkout has no account to credit, so this only shows once
          actually signed in, same gate as anywhere else this balance appears. */}
      <Show when={props.isMember && props.coinsEarned > 0}>
        <div class="flex items-center gap-2 rounded-pill bg-surface-pink py-2 pl-2 pr-4 text-sm font-semibold text-ink">
          <img src={coinMark} alt="" class="size-6 shrink-0" />
          คุณจะได้รับ {props.coinsEarned.toLocaleString("th-TH")} คะแนนจากคำสั่งซื้อนี้
        </div>
      </Show>
      <div class="flex w-full max-w-sm flex-col gap-2">
        {/* Paid: straight to the "กำลังจัดส่ง" tab, where this order now sits. */}
        <Button href="/account?tab=in_progress" variant="primary" size="lg" class="w-full">
          ดูประวัติการซื้อ
        </Button>
        <Button href="/" variant="outline" size="lg" class="w-full">
          กลับไปช้อปต่อ
        </Button>
      </div>
    </div>
  );
}
