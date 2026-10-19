import { createSignal, createUniqueId, For, onMount, Show, type JSX } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { Button } from "~/components/shared/Button";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CheckIcon } from "~/components/shared/icons";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { AccountGuestPrompt } from "~/components/account/AccountGuestPrompt";
import { OrderTrackingTimeline } from "~/components/account/OrderTrackingTimeline";
import { OrderItemMeta, OrderItemPrice } from "~/components/account/OrderCard";
import { LineContactNote, PaymentMethodLabel, ReviewStars, ShippingMethodLabel } from "~/components/account/OrderMeta";
import { useAuth } from "~/lib/auth";
import { getPaymentDeadline, getPaymentStatus, PAYMENT_STATUS_META } from "~/lib/accountData";
import { computeCoinsEarned } from "~/lib/cartSelectors";
import { formatAddress } from "~/lib/checkoutData";
import { canReviewOrder, createMockOrderRepository, createOrderHistory, getOrderRating, isOrderReviewed } from "~/lib/orderHistory";
import { resolveTier, yearlySpend, type TierId } from "~/lib/membership";
import { formatEventTime, formatOrderDateTime } from "~/lib/orderTracking";
import type { Order } from "~/lib/types";

// Same Kobalte Dialog SSR/hydration workaround as ProductCard's QuickAddSheet.
const OrderReviewDialog = clientOnly(() => import("~/components/account/OrderReviewDialog").then((m) => ({ default: m.OrderReviewDialog })));

/** Phase 05 — Order Detail (the "ดูรายละเอียด" target OrderCard already linked to). */
export default function OrderDetailPage() {
  const auth = useAuth();
  const params = useParams();
  const history = createOrderHistory(() => createMockOrderRepository());
  const orderId = () => params.id ?? "";
  const order = () => history.getById(orderId());

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 pb-6 pt-4">
        <Container width="wide" class="flex flex-col gap-4">
          <Breadcrumb items={[{ label: "หน้าแรก", href: "/" }, { label: "ประวัติการซื้อ", href: "/account" }, { label: orderId() }]} />
          <Show when={auth.isAuthenticated()} fallback={<AccountGuestPrompt />}>
            <Show when={history.ready()} fallback={<div class="h-64 animate-pulse rounded-card bg-white" aria-hidden="true" />}>
              <Show when={order()} fallback={<OrderNotFound id={orderId()} />}>
                {(o) => (
                  <OrderDetail order={o()} tier={resolveTier(yearlySpend(history.orders())).current.id} />
                )}
              </Show>
            </Show>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function OrderDetail(props: {
  order: Order;
  /** The shopper's member tier — sets the coin multiplier. */
  tier: TierId;
}) {
  const [reviewOpen, setReviewOpen] = createSignal(false);
  const showTracking = () => !["pending_payment", "cancelled"].includes(props.order.status);
  const p = () => props.order.payment;
  const paymentMeta = () => PAYMENT_STATUS_META[getPaymentStatus(props.order)];
  // "ติดตามพัสดุ" on the order card links to `#tracking` — the section only exists once the order has loaded, so scroll here.
  onMount(() => {
    if (location.hash === "#tracking") document.getElementById("tracking")?.scrollIntoView({ block: "start" });
  });

  // Same header text as the Purchase History card: "คำสั่งซื้อ วันที่ ..." then the order number. No status badge here — the current status is the tracking box's hero (or the banner above when there's no tracking).
  const title = (
    <div>
      <h1 class="text-xl font-bold text-ink sm:text-2xl">คำสั่งซื้อ วันที่ {formatOrderDateTime(props.order.placedAt)}</h1>
      <p class="text-sm text-ink-gray">{props.order.id}</p>
    </div>
  );


  return (
    <div class="flex flex-col gap-4">
      {/* No tracking box yet (pending/cancelled) — the title gets its own card; otherwise it heads the tracking box. */}
      <Show when={!showTracking()}>
        <div class="rounded-card bg-white p-4 shadow-card sm:p-6">{title}</div>
      </Show>

      <Show when={props.order.status === "cancelled"}>
        <Banner tone="neutral">
          คำสั่งซื้อนี้ถูกยกเลิกแล้ว
          <Show when={props.order.cancelledAt}> เมื่อ {formatEventTime(props.order.cancelledAt!)}</Show>
          <Show when={props.order.cancelReason}>
            {(reason) => <span class="mt-0.5 block text-sm text-ink-gray">{reason()}</span>}
          </Show>
        </Banner>
      </Show>
      <Show when={props.order.status === "pending_payment"}>
        <Banner tone="warning">
          <span class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span class="flex flex-col">
              <span>รอชำระเงิน เราจะเริ่มเตรียมและจัดส่งสินค้าทันทีที่ชำระเงินเรียบร้อย</span>
              {/* Past this time the order is cancelled automatically (PAYMENT_WINDOW_HOURS) */}
              <span class="text-sm">
                ชำระภายใน <span class="font-semibold">{formatEventTime(getPaymentDeadline(props.order))}</span> มิฉะนั้นคำสั่งซื้อจะถูกยกเลิกอัตโนมัติ
              </span>
            </span>
            <Button href={`/account/orders/${props.order.id}/pay`} variant="primary" class="w-full shrink-0 sm:w-auto">
              ชำระเงิน {formatTHB(props.order.total)}
            </Button>
          </span>
        </Banner>
      </Show>

      {/* Tracking on the left; the right column starts with the items, above the address.
          No tracking yet (pending/cancelled): items + address | payment, side by side. */}
      <div class="grid gap-4 lg:items-start" classList={{ "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]": showTracking() }}>
        <Show when={showTracking()}>
          <OrderTrackingTimeline shipment={props.order.shipment} header={title} />
        </Show>

        <div class="gap-4" classList={{ "flex flex-col": showTracking(), "grid lg:grid-cols-2 lg:items-start": !showTracking() }}>
          <div class="flex flex-col gap-4">
            <OrderItemsBox order={props.order} tier={props.tier} />

            <section aria-labelledby="order-address-heading" class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:p-6">
              <h2 id="order-address-heading" class="text-lg font-semibold text-ink">
                ที่อยู่จัดส่ง
              </h2>
              <p class="text-sm font-semibold text-ink">
                {props.order.shippingAddress.recipientName} <span class="font-normal text-ink-gray">{props.order.shippingAddress.phone}</span>
              </p>
              <p class="text-sm text-ink">{formatAddress(props.order.shippingAddress)}</p>
            </section>
          </div>

          <div class="flex flex-col gap-4">
            <section aria-labelledby="order-payment-heading" class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 id="order-payment-heading" class="text-lg font-semibold text-ink">
                  สรุปการชำระเงิน
                </h2>
                <span class={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${paymentMeta().badgeClass}`}>{paymentMeta().label}</span>
              </div>
              <Row label="ช่องทางชำระเงิน" value={<PaymentMethodLabel method={p().method} />} />
              <Row label="การจัดส่ง" value={<ShippingMethodLabel method={props.order.shipment.method} />} />
              <div class="my-1 h-px bg-surface-gray" />
              <Row label="ราคาสินค้า" value={formatTHB(p().subtotal)} />
              <Row label="ค่าจัดส่ง" value={p().shippingFee ? formatTHB(p().shippingFee) : "ฟรี"} />
              <Show when={p().discount > 0}>
                <Row label={`ส่วนลดคูปอง${p().couponCode ? ` (${p().couponCode})` : ""}`} value={`-${formatTHB(p().discount)}`} accent />
              </Show>
              <Show when={p().coinDiscount > 0}>
                <Row label="ส่วนลด Charmiss Coin" value={`-${formatTHB(p().coinDiscount)}`} accent />
              </Show>
              <div class="flex items-center justify-between border-t border-surface-gray pt-2">
                <span class="font-semibold text-ink">ยอดรวมทั้งหมด</span>
                <span class="text-lg font-bold text-brand-pink">{formatTHB(props.order.total)}</span>
              </div>
            </section>

            {/* Review (delivered orders) + the LINE note — cancelling / returns go through LINE Official, not self-serve. */}
            <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-6">
              <Show when={canReviewOrder(props.order)}>
                <Show
                  when={isOrderReviewed(props.order)}
                  fallback={
                    <Button type="button" variant="primary" size="lg" class="w-full" onClick={() => setReviewOpen(true)}>
                      รีวิวสินค้า
                    </Button>
                  }
                >
                  <div class="flex min-h-[44px] flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-pill bg-success-soft px-4 py-2 text-base font-medium text-success">
                    <span class="flex items-center gap-1.5">
                      <CheckIcon class="size-4" /> รีวิวแล้ว ขอบคุณสำหรับความคิดเห็น
                    </span>
                    <Show when={getOrderRating(props.order)}>{(r) => <ReviewStars rating={r()} class="size-4" showValue={r() % 1 !== 0} />}</Show>
                  </div>
                </Show>
              </Show>
              <LineContactNote />
            </div>

            <Button href="/account" variant="outline" class="w-full lg:hidden">
              กลับไปที่ประวัติการซื้อ
            </Button>
          </div>
        </div>
      </div>

      <Show when={canReviewOrder(props.order)}>
        <OrderReviewDialog order={props.order} open={reviewOpen()} onOpenChange={setReviewOpen} />
      </Show>
    </div>
  );
}

/** Collapsed by default: heading + thumbnails; tap to list every item. */
function OrderItemsBox(props: { order: Order; tier: TierId }) {
  const [open, setOpen] = createSignal(false);
  const items = () => props.order.items;
  // Display-only mockup — no loyalty backend; same earn basis + tier multiplier as Checkout (shipping excluded), credited on delivery.
  const coins = () => computeCoinsEarned(props.order.total - props.order.payment.shippingFee, props.tier);
  const panelId = createUniqueId();
  return (
    <section aria-labelledby="order-items-heading" class="flex flex-col rounded-card bg-white p-4 shadow-card sm:p-6">
      <h2 id="order-items-heading">
        <button
          type="button"
          aria-expanded={open()}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          class="font-normal flex min-h-[44px] w-full items-center gap-3 text-left"
        >
          <span class="flex-1 text-lg font-semibold text-ink">สินค้า ({items().reduce((n, i) => n + i.qty, 0)} ชิ้น)</span>
          <Show when={!open()}>
            <span class="flex -space-x-2" aria-hidden="true">
              <For each={items().slice(0, 3)}>
                {(item) => <img src={item.image} alt="" loading="lazy" class="size-10 rounded-xl border-2 border-white bg-white object-cover ring-1 ring-surface-gray" />}
              </For>
            </span>
          </Show>
          <ChevronIcon direction={open() ? "up" : "down"} class="size-6 text-ink-gray" />
        </button>
      </h2>
      <Show when={props.order.status !== "cancelled" && coins() > 0}>
        <p class="text-sm font-medium text-success">
          {props.order.status === "completed" ? `ได้รับ +${coins().toLocaleString("th-TH")} คอยน์จากคำสั่งซื้อนี้` : `รับ +${coins().toLocaleString("th-TH")} คอยน์เมื่อได้รับสินค้า`}
        </p>
      </Show>
      <Show when={open()}>
        <div id={panelId} class="mt-3 flex flex-col gap-3">
          <For each={items()}>
            {(item) => (
              <div class="flex items-center gap-3">
                <img src={item.image} alt="" loading="lazy" class="size-16 shrink-0 rounded-2xl border border-surface-gray object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                  <OrderItemMeta item={item} unitPrice />
                </div>
                <OrderItemPrice item={item} />
              </div>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}

function Row(props: { label: string; value: JSX.Element; accent?: boolean }) {
  return (
    <div class="flex items-start justify-between gap-3 text-sm">
      <span class="text-ink-gray">{props.label}</span>
      <span class="text-right" classList={{ "text-success": props.accent, "text-ink": !props.accent }}>
        {props.value}
      </span>
    </div>
  );
}

function Banner(props: { tone: "neutral" | "warning"; children: JSX.Element }) {
  return (
    <div class="rounded-card px-4 py-3 text-sm text-ink" classList={{ "bg-surface-gray": props.tone === "neutral", "bg-warning-soft": props.tone === "warning" }} role="status">
      {props.children}
    </div>
  );
}

function OrderNotFound(props: { id: string }) {
  return (
    <div class="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-16 text-center shadow-card">
      <p class="text-lg font-semibold text-ink">ไม่พบคำสั่งซื้อ {props.id}</p>
      <p class="text-sm text-ink-gray">คำสั่งซื้อนี้อาจไม่มีอยู่ หรือไม่ได้อยู่ในบัญชีของคุณ</p>
      <A href="/account" class="text-brand-pink underline">
        กลับไปที่ประวัติการซื้อ
      </A>
    </div>
  );
}
