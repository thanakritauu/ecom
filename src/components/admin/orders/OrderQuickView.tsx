import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META, type AdminOrder } from "~/lib/adminOrders";
import { OrderTimeline } from "./OrderTimeline";

/**
 * PART 11 — order summary, not the full Order Detail page's every section.
 * Global UI Correction — Final Refinement #4/5: every Order Quick View
 * (Dashboard, Order List, and any future entry point) shares this exact
 * component, so the Products Summary + full Timeline shown here are
 * automatically identical everywhere rather than something to keep in sync
 * by hand. Timeline reuses `OrderTimeline` as-is (the same one Order Detail
 * renders) — same Order Status Model, no second status list.
 *
 * Phase 04 spec #18: Quick View's Total section is the full Subtotal/
 * Discount/Shipping/Grand Total breakdown, not just one grand-total line —
 * same numbers `orders/[id].tsx` shows, same `AdminOrder.totals` source.
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
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ลูกค้า</span>
          <span class="font-medium text-ink">{o().customer.name}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">อีเมล</span>
          <span class="truncate font-medium text-ink">{o().customer.email}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">สินค้า</span>
          <span class="font-medium text-ink">{o().items.length} รายการ</span>
        </div>
        <div class="mt-1 flex flex-col gap-1 border-t border-surface-gray pt-2">
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">ยอดรวมสินค้า</span>
            <span class="text-ink">{formatAdminCurrency(o().totals.subtotal)}</span>
          </div>
          <Show when={o().totals.discount > 0}>
            <div class="flex items-center justify-between">
              <span class="text-ink-gray">ส่วนลด</span>
              <span class="text-ink">-{formatAdminCurrency(o().totals.discount)}</span>
            </div>
          </Show>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">ค่าจัดส่ง</span>
            <span class="text-ink">{o().totals.shippingFee > 0 ? formatAdminCurrency(o().totals.shippingFee) : "ฟรี"}</span>
          </div>
          <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
            <span>ยอดรวมทั้งหมด</span>
            <span>{formatAdminCurrency(o().totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ORDER_STATUS_META[o().orderStatus].tone}>{ORDER_STATUS_META[o().orderStatus].label}</StatusBadge>
        <StatusBadge tone={PAYMENT_STATUS_META[o().paymentStatus].tone}>{PAYMENT_STATUS_META[o().paymentStatus].label}</StatusBadge>
        <StatusBadge tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[o().fulfillmentStatus].label}</StatusBadge>
      </div>

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
              </div>
              <p class="shrink-0 text-sm font-semibold text-ink">{formatAdminCurrency(item.lineTotal)}</p>
            </div>
          )}
        </For>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ไทม์ไลน์คำสั่งซื้อ</p>
        <OrderTimeline order={o()} />
      </div>
    </div>
  );
}
