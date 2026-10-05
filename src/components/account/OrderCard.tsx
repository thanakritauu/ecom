import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Order, OrderItem } from "~/lib/types";
import { CARRIERS } from "~/lib/carriers";
import { formatOrderDate, getOrderDisplayStatus } from "~/lib/orderTracking";
import { formatTHB } from "../shared/PriceDisplay";
import { GiftIcon } from "../shared/icons";

const MAX_ITEMS_SHOWN = 2;

/**
 * One order in Purchase History, with a single status line: the order's
 * status until DHL has the parcel, then DHL's own status
 * (`getOrderDisplayStatus`). Whole detail — coins included — lives on
 * `/account/orders/:id`.
 */
export function OrderCard(props: { order: Order }) {
  const status = () => getOrderDisplayStatus(props.order);
  const itemCount = () => props.order.items.reduce((sum, item) => sum + item.qty, 0);
  // The status line's one action: pay → track → view details.
  const action = () =>
    props.order.status === "pending_payment"
      ? { href: `${detailHref()}/pay`, label: "ชำระเงิน" }
      : ["preparing", "handed_over", "shipping"].includes(props.order.status)
        ? { href: `${detailHref()}#tracking`, label: "ติดตามพัสดุ" }
        : { href: detailHref(), label: "ดูรายละเอียด" };
  const detailHref = () => `/account/orders/${props.order.id}`;

  return (
    <article class="flex w-full flex-col gap-3 rounded-2xl border border-surface-gray p-4">
      <div class="flex flex-col gap-0.5">
        <A href={detailHref()} class="text-base font-semibold text-ink lg:hover:text-brand-pink">
          คำสั่งซื้อ {props.order.id}
        </A>
        <p class="text-sm text-ink-gray">
          {formatOrderDate(props.order.placedAt)} · {itemCount()} ชิ้น
        </p>
      </div>

      <A href={detailHref()} class="flex flex-col gap-2" aria-label={`ดูรายละเอียดคำสั่งซื้อ ${props.order.id}`}>
        <For each={props.order.items.slice(0, MAX_ITEMS_SHOWN)}>
          {(item) => (
            <div class="flex items-center gap-3">
              <img src={item.image} alt="" loading="lazy" class="size-[60px] shrink-0 rounded-2xl border border-surface-gray object-cover" />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                <OrderItemMeta item={item} />
              </div>
              <OrderItemPrice item={item} />
            </div>
          )}
        </For>
        <Show when={props.order.items.length > MAX_ITEMS_SHOWN}>
          <p class="text-xs text-ink-gray">และสินค้าอีก {props.order.items.length - MAX_ITEMS_SHOWN} รายการ</p>
        </Show>
      </A>

      {/* The order's one status line — order status until DHL has it, then DHL's own status; tracking lives here too */}
      <div class="flex items-center gap-3 rounded-2xl bg-surface-gray/60 py-2 pl-3 pr-2 text-sm">
        <div class="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-ink-gray">สถานะ:</span>
          <span class={`rounded-pill px-2 py-0.5 text-xs font-semibold ${status().badgeClass}`}>{status().label}</span>
          <Show when={props.order.shipment.trackingNumber}>
            {(n) => (
              <span class="text-xs text-ink-gray">
                {CARRIERS[props.order.shipment.carrier].name} · <span class="font-medium text-ink">{n()}</span>
              </span>
            )}
          </Show>
        </div>
        <Show when={action()}>
          {(act) => (
            <A
              href={act().href}
              class="flex min-h-8 shrink-0 items-center justify-center rounded-pill bg-brand-pink px-3 text-xs font-medium text-white transition-colors duration-150 lg:hover:bg-brand-pink/90"
            >
              {act().label}
            </A>
          )}
        </Show>
      </div>
      <Show when={props.order.returnRequest}>
        <p class="rounded-2xl bg-warning-soft px-3 py-2 text-sm text-ink">ส่งคำขอคืนสินค้าแล้ว · รอตรวจสอบ</p>
      </Show>

      <p class="flex items-baseline justify-between gap-2 border-t border-surface-gray pt-3">
        <span class="text-sm text-ink-gray">ยอดรวม</span>
        <span class="text-lg font-bold text-ink">{formatTHB(props.order.total)}</span>
      </p>
    </article>
  );
}

/** The "ของแถมฟรี" pill — same look as the cart's `GiftItemRow`. */
export function GiftBadge() {
  return (
    <span class="inline-flex w-fit shrink-0 items-center gap-1 rounded-pill bg-gradient-to-r from-[#7650FF] to-[#27CD97] px-2 py-0.5 text-xs font-semibold text-white">
      <GiftIcon class="size-3.5" /> ของแถมฟรี
    </span>
  );
}

/** An order line's sub-line: option + qty, or the gift pill + qty for the free gift. `unitPrice` adds "฿x x n" (order detail). */
export function OrderItemMeta(props: { item: OrderItem; unitPrice?: boolean }) {
  return (
    <Show
      when={props.item.isGift}
      fallback={
        <p class="text-xs text-ink-gray">
          {props.item.variantLabel} · <span class="whitespace-nowrap">{props.unitPrice ? `${formatTHB(props.item.price)} x ${props.item.qty}` : `x${props.item.qty}`}</span>
        </p>
      }
    >
      <p class="mt-0.5 flex items-center gap-1.5 text-xs text-ink-gray">
        <GiftBadge /> x{props.item.qty}
      </p>
    </Show>
  );
}

/** Line total — "ฟรี" in red for the gift, as in `GiftItemRow`. */
export function OrderItemPrice(props: { item: OrderItem }) {
  return (
    <Show when={props.item.isGift} fallback={<p class="shrink-0 text-sm font-semibold text-ink">{formatTHB(props.item.price * props.item.qty)}</p>}>
      <p class="shrink-0 text-sm font-bold text-system-red">ฟรี</p>
    </Show>
  );
}
