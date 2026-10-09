import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import type { Order, OrderItem } from "~/lib/types";
import { CARRIERS } from "~/lib/carriers";
import { canReviewOrder, getOrderRating, isOrderReviewed } from "~/lib/orderHistory";
import { getPaymentDeadline } from "~/lib/accountData";
import { formatEventTime, formatOrderDate, getOrderDisplayStatus } from "~/lib/orderTracking";
import { formatTHB } from "../shared/PriceDisplay";
import { CheckIcon, GiftIcon } from "../shared/icons";
import { ReviewStars } from "./OrderMeta";

// Same Kobalte Dialog SSR/hydration workaround as ProductCard's QuickAddSheet.
const OrderReviewDialog = clientOnly(() => import("./OrderReviewDialog").then((m) => ({ default: m.OrderReviewDialog })));

const PILL = "flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-pill px-3 text-xs font-medium transition-colors duration-150";
const PILL_PRIMARY = `${PILL} bg-brand-pink text-white lg:hover:bg-brand-pink/90`;
const PILL_OUTLINE = `${PILL} border border-brand-pink bg-white text-brand-pink lg:hover:bg-surface-pink`;

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
  // Delivered orders: "รีวิว" (solid) leads, "ดูรายละเอียด" steps down to outline; once reviewed, a "รีวิวแล้ว" chip with the stars given.
  const reviewable = () => canReviewOrder(props.order);
  const [reviewOpen, setReviewOpen] = createSignal(false);

  return (
    <article class="flex w-full flex-col gap-3 rounded-2xl border border-surface-gray p-4">
      <div class="flex flex-col gap-0.5">
        <A href={detailHref()} class="text-base font-semibold text-ink lg:hover:text-brand-pink">
          คำสั่งซื้อ {props.order.id}
        </A>
        <p class="text-sm text-ink-gray">
          {formatOrderDate(props.order.placedAt)} จำนวน {itemCount()} ชิ้น
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
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-gray/60 py-2 pl-3 pr-2 text-sm">
        {/* With the review + detail pair, a 200px basis wraps the pair to its own row on a phone instead of squeezing the status */}
        <div class="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-1" classList={{ "flex-[1_1_200px]": reviewable(), "flex-1": !reviewable() }}>
          <span class="text-ink-gray">สถานะ:</span>
          <span class={`rounded-pill px-2 py-0.5 text-xs font-semibold ${status().badgeClass}`}>{status().label}</span>
          {/* Unpaid past this time → auto-cancelled (PAYMENT_WINDOW_HOURS) */}
          <Show when={props.order.status === "pending_payment"}>
            <span class="text-xs text-ink-gray">
              ชำระภายใน <span class="font-medium text-ink">{formatEventTime(getPaymentDeadline(props.order))}</span>
            </span>
          </Show>
          <Show when={props.order.shipment.trackingNumber}>
            {(n) => (
              <span class="text-xs text-ink-gray">
                {CARRIERS[props.order.shipment.carrier].name} เลขพัสดุ <span class="font-medium text-ink">{n()}</span>
              </span>
            )}
          </Show>
        </div>
        <Show
          when={reviewable()}
          fallback={
            <A href={action().href} class={PILL_PRIMARY}>
              {action().label}
            </A>
          }
        >
          <div class="ml-auto flex shrink-0 items-center gap-2">
            <Show
              when={isOrderReviewed(props.order)}
              fallback={
                <button type="button" onClick={() => setReviewOpen(true)} class={PILL_PRIMARY}>
                  รีวิว
                </button>
              }
            >
              <span class="flex min-h-8 items-center gap-1 rounded-pill bg-success-soft px-3 text-xs font-medium text-success">
                <CheckIcon class="size-3.5" /> รีวิวแล้ว
                <Show when={getOrderRating(props.order)}>{(r) => <ReviewStars rating={r()} class="size-3" />}</Show>
              </span>
            </Show>
            <A href={detailHref()} class={PILL_OUTLINE}>
              ดูรายละเอียด
            </A>
          </div>
        </Show>
      </div>

      <p class="flex items-baseline justify-between gap-2 border-t border-surface-gray pt-3">
        <span class="text-sm text-ink-gray">ยอดรวม</span>
        <span class="text-lg font-bold text-ink">{formatTHB(props.order.total)}</span>
      </p>
      <Show when={reviewable()}>
        <OrderReviewDialog order={props.order} open={reviewOpen()} onOpenChange={setReviewOpen} />
      </Show>
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
        <p class="flex flex-wrap gap-x-2 text-xs text-ink-gray">
          <span>{props.item.variantLabel}</span>
          <span class="whitespace-nowrap">{props.unitPrice ? `${formatTHB(props.item.price)} x ${props.item.qty}` : `x${props.item.qty}`}</span>
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
