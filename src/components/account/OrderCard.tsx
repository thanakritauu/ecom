import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Order } from "~/lib/types";
import { ORDER_STATUS_META } from "~/lib/accountData";
import { CARRIERS } from "~/lib/carriers";
import { formatOrderDate, getShipmentStatus, SHIPMENT_STATUS_META } from "~/lib/orderTracking";
import { computeCoinsEarned } from "~/lib/cartSelectors";
import { formatTHB } from "../shared/PriceDisplay";

const MAX_ITEMS_SHOWN = 2;

/**
 * One order in Purchase History. Order Status (payment/order lifecycle) and
 * Shipping Status (where the parcel is) are shown as two separate labelled
 * lines so they're never confused. Whole detail lives on
 * `/account/orders/:id`.
 */
export function OrderCard(props: { order: Order }) {
  const meta = () => ORDER_STATUS_META[props.order.status];
  const shipmentStatus = () => getShipmentStatus(props.order.shipment);
  const shipmentMeta = () => SHIPMENT_STATUS_META[shipmentStatus()];
  const itemCount = () => props.order.items.reduce((sum, item) => sum + item.qty, 0);
  const showShipping = () => !["pending_payment", "cancelled"].includes(props.order.status);
  const detailHref = () => `/account/orders/${props.order.id}`;

  return (
    <article class="flex w-full flex-col gap-3 rounded-2xl border border-surface-gray p-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="flex flex-col gap-0.5">
          <p class="text-base font-semibold text-ink">คำสั่งซื้อ #{props.order.id}</p>
          <p class="text-sm text-ink-gray">
            {formatOrderDate(props.order.placedAt)} · {itemCount()} ชิ้น
          </p>
        </div>
        <span class={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${meta().badgeClass}`}>{meta().label}</span>
      </div>

      <A href={detailHref()} class="flex flex-col gap-2" aria-label={`ดูรายละเอียดคำสั่งซื้อ #${props.order.id}`}>
        <For each={props.order.items.slice(0, MAX_ITEMS_SHOWN)}>
          {(item) => (
            <div class="flex items-center gap-3">
              <img src={item.image} alt="" loading="lazy" class="size-[60px] shrink-0 rounded-2xl border border-surface-gray object-cover" />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-sm font-medium text-ink">{item.name}</p>
                <p class="text-xs text-ink-gray">
                  {item.variantLabel} · x{item.qty}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold text-ink">{formatTHB(item.price * item.qty)}</p>
            </div>
          )}
        </For>
        <Show when={props.order.items.length > MAX_ITEMS_SHOWN}>
          <p class="text-xs text-ink-gray">และสินค้าอีก {props.order.items.length - MAX_ITEMS_SHOWN} รายการ</p>
        </Show>
      </A>

      {/* Shipping status — its own line, separate from the order status badge above */}
      <Show when={showShipping()}>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface-gray/60 px-3 py-2 text-sm">
          <span class="text-ink-gray">การจัดส่ง:</span>
          <span class={`rounded-pill px-2 py-0.5 text-xs font-semibold ${shipmentMeta().badgeClass}`}>{shipmentMeta().label}</span>
          <Show when={props.order.shipment.trackingNumber}>
            {(n) => (
              <span class="text-xs text-ink-gray">
                {CARRIERS[props.order.shipment.carrier].name} · <span class="font-medium text-ink">{n()}</span>
              </span>
            )}
          </Show>
        </div>
      </Show>
      <Show when={props.order.returnRequest}>
        <p class="rounded-2xl bg-[#fff4e6] px-3 py-2 text-sm text-ink">ส่งคำขอคืนสินค้าแล้ว · รอตรวจสอบ</p>
      </Show>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-surface-gray pt-3">
        <div class="flex flex-col">
          <p class="text-xs text-ink-gray">ยอดรวม</p>
          <p class="text-lg font-bold text-ink">{formatTHB(props.order.total)}</p>
          {/* Display-only mockup — no loyalty backend; cancelled orders never earned anything. */}
          <Show when={props.order.status !== "cancelled"}>
            <p class="text-xs font-medium text-success">+{computeCoinsEarned(props.order.total).toLocaleString("th-TH")} คอยน์</p>
          </Show>
        </div>
        <A
          href={detailHref()}
          class="flex min-h-[44px] items-center justify-center rounded-pill border border-brand-pink px-5 text-sm font-medium text-brand-pink transition-colors duration-150 hover:bg-surface-pink"
        >
          {["shipping", "preparing", "paid"].includes(props.order.status) ? "ติดตามพัสดุ" : "ดูรายละเอียด"}
        </A>
      </div>
    </article>
  );
}
