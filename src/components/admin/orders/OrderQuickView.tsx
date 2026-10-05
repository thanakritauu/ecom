import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ReceiptIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  FULFILLMENT_STATUS_META,
  RETURN_STATUS_META,
  CANCELLED_BY_LABEL,
  paymentFailureLabel,
  type AdminOrder,
} from "~/lib/adminOrders";
import { OrderTimeline } from "./OrderTimeline";
import { OrderTotalsBreakdown } from "./OrderTotalsBreakdown";

/**
 * PART 11 — order summary, not the full Order Detail page's every section.
 * Every Order Quick View (Dashboard, Order List, Customer Detail) shares
 * this exact component, so its totals (`OrderTotalsBreakdown`) and DHL
 * timeline (`OrderTimeline`) are the same ones Order Detail renders.
 */
export function OrderQuickView(props: { order: AdminOrder }) {
  const o = () => props.order;

  return (
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-base font-semibold text-ink">{o().orderNumber}</p>
        <p class="text-sm text-ink-gray">{o().createdAt}</p>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between gap-3">
          <span class="text-ink-gray">ลูกค้า</span>
          <span class="font-medium text-ink">{o().customer.name}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-ink-gray">อีเมล</span>
          <span class="truncate font-medium text-ink">{o().customer.email}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-ink-gray">ชำระผ่าน</span>
          <span class="truncate font-medium text-ink">
            {o().payment.method}
            {o().payment.detail ? ` · ${o().payment.detail}` : ""}
          </span>
        </div>
        <Show when={o().shipping.trackingNumber}>
          <div class="flex items-center justify-between gap-3">
            <span class="text-ink-gray">เลขพัสดุ DHL</span>
            <span class="font-medium tracking-wide text-ink">{o().shipping.trackingNumber}</span>
          </div>
        </Show>
        <div class="mt-1 border-t border-border pt-2">
          <OrderTotalsBreakdown order={o()} />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ORDER_STATUS_META[o().orderStatus].tone}>{ORDER_STATUS_META[o().orderStatus].label}</StatusBadge>
        <StatusBadge tone={PAYMENT_STATUS_META[o().paymentStatus].tone}>{PAYMENT_STATUS_META[o().paymentStatus].label}</StatusBadge>
        <StatusBadge tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[o().fulfillmentStatus].label}</StatusBadge>
        <Show when={o().returnRequest}>
          {(r) => <StatusBadge tone={RETURN_STATUS_META[r().status].tone}>{RETURN_STATUS_META[r().status].label}</StatusBadge>}
        </Show>
      </div>

      <Show when={o().payment.failureReason}>
        {(reason) => <p class="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger-strong">ชำระเงินครั้งล่าสุดไม่สำเร็จ: {paymentFailureLabel(reason())}</p>}
      </Show>
      <Show when={o().cancellation}>
        {(c) => (
          <p class="rounded-card bg-surface-gray px-3 py-2 text-sm text-ink-gray">
            {CANCELLED_BY_LABEL[c().by]}
            {c().reason ? ` · ${c().reason}` : ""}
          </p>
        )}
      </Show>

      {/* Order + Receipt Phase §25 — "ดูใบเสร็จ" alongside the drawer's own "ดูรายละเอียดทั้งหมด" footer button. */}
      <A
        href={`/admin/orders/${o().id}/receipt`}
        class="flex min-h-11 items-center justify-center gap-2 rounded-pill border border-border text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-pink"
      >
        <ReceiptIcon class="size-4" /> ดูใบเสร็จ
      </A>

      <div class="flex flex-col gap-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าในคำสั่งซื้อ</p>
        <For each={o().items}>
          {(item) => (
            <div class="flex gap-3">
              <img src={item.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-ink">{item.name}</p>
                <p class="text-xs text-ink-gray">
                  {item.variantLabel ? `${item.variantLabel} · ` : ""}
                  {formatAdminCurrency(item.unitPrice)} × {item.qty}
                </p>
                <Show when={item.isFreeGift}>
                  <StatusBadge tone="success" class="mt-1">ของแถมฟรี</StatusBadge>
                </Show>
              </div>
              <p class="shrink-0 text-sm font-semibold text-ink">{item.isFreeGift ? "ฟรี" : formatAdminCurrency(item.lineTotal)}</p>
            </div>
          )}
        </For>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ติดตามการจัดส่ง (DHL)</p>
        <OrderTimeline order={o()} />
      </div>
    </div>
  );
}
