import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { SheetModal } from "./SheetModal";
import { CheckIcon } from "./icons";
import { pushToast } from "~/lib/toast";
import type { Coupon } from "~/lib/cartSelectors";

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

/** "31 ตุลาคม 2569 เวลา 23:59 น." — the coupon's real `expiresAt`, read in Bangkok time. */
function expiryText(expiresAt: string) {
  const d = new Date(expiresAt);
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
  return `${date} เวลา ${time} น.`;
}

/**
 * Coupon details + usage conditions, opened by tapping a `CouponCard`. The
 * conditions mirror how Checkout actually prices an order (`computeTotals`):
 * one coupon per order, discount taken off the product subtotal (shipping
 * untouched), min spend checked against that subtotal, and Charmiss Coin
 * redemption stacks on top. `ticket` is the same coupon ticket the shopper
 * tapped (picture only) shown as the header; `action` is the card's own
 * collect/use button.
 */
export function CouponDetailSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; coupon: Coupon; ticket: JSX.Element; action: JSX.Element }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(resetTimer));
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(props.coupon.code);
      setCopied(true);
      pushToast("คัดลอกโค้ดแล้ว");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("คัดลอกไม่สำเร็จ ลองกดค้างที่โค้ดเพื่อคัดลอก", "error");
    }
  };

  const conditions = () => [
    `ส่วนลด ${baht(props.coupon.discount)} เมื่อยอดสินค้าครบ ${baht(props.coupon.minSpend)} ขึ้นไป`,
    "คำนวณจากยอดสินค้า ไม่รวมค่าจัดส่ง",
    "ใช้ได้กับสินค้าทุกรายการ",
    "ใช้ได้ 1 คูปองต่อคำสั่งซื้อ ใช้ร่วมกับคูปองอื่นไม่ได้",
    "ใช้ได้ 1 ครั้งต่อบัญชี",
    "ใช้ร่วมกับส่วนลดจาก Charmiss Coin ได้",
    "เลือกคูปองหรือกรอกโค้ดได้ที่หน้าชำระเงิน",
  ];

  return (
    <SheetModal nested open={props.open} onOpenChange={props.onOpenChange} height="auto" title="รายละเอียดคูปอง" footer={props.action}>
      {/* Inset so the ticket's own drawn shadow/notches aren't clipped by the scroll area. */}
      <div class="px-1 pt-1">{props.ticket}</div>

      <dl class="flex flex-col gap-3 text-sm">
        <Row label="โค้ดส่วนลด">
          <span class="flex items-center justify-end gap-1">
            <span class="select-all rounded-pill border border-dashed border-brand-pink px-3 py-0.5 font-semibold tracking-wide text-brand-pink">{props.coupon.code}</span>
            {/* Icon-only copy — 44px tap area; the tick (DSL CheckIcon) shows for 2s after copying. */}
            <button
              type="button"
              onClick={copyCode}
              aria-label={copied() ? `คัดลอกโค้ด ${props.coupon.code} แล้ว` : `คัดลอกโค้ด ${props.coupon.code}`}
              title="คัดลอกโค้ด"
              class="-my-1 flex size-11 shrink-0 items-center justify-center rounded-pill text-brand-pink transition-colors lg:hover:bg-surface-pink"
            >
              <Show
                when={copied()}
                fallback={
                  <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" />
                  </svg>
                }
              >
                <CheckIcon class="size-5" />
              </Show>
            </button>
          </span>
        </Row>
        <Row label="ยอดซื้อขั้นต่ำ">{baht(props.coupon.minSpend)}</Row>
        <Row label="ใช้ได้ถึง">{expiryText(props.coupon.expiresAt)}</Row>
      </dl>

      <section aria-labelledby="coupon-conditions-heading" class="flex flex-col gap-2">
        <h3 id="coupon-conditions-heading" class="text-base font-semibold text-ink">
          เงื่อนไขการใช้งาน
        </h3>
        <ul class="flex flex-col gap-1.5 text-sm leading-[1.75] text-ink-gray">
          <For each={conditions()}>
            {(text) => (
              <li class="flex gap-2">
                <span class="mt-[0.7em] size-1.5 shrink-0 rounded-pill bg-brand-pink" aria-hidden="true" />
                <span>{text}</span>
              </li>
            )}
          </For>
        </ul>
      </section>
    </SheetModal>
  );
}

function Row(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4 border-b border-border pb-3">
      <dt class="shrink-0 text-ink-gray">{props.label}</dt>
      <dd class="text-right font-medium text-ink">{props.children}</dd>
    </div>
  );
}
