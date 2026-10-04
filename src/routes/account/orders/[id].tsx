import { createSignal, For, Show, type JSX } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { Button } from "~/components/shared/Button";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { AccountGuestPrompt } from "~/components/account/AccountGuestPrompt";
import { OrderTrackingTimeline } from "~/components/account/OrderTrackingTimeline";
import { useAuth } from "~/lib/auth";
import { pushToast } from "~/lib/toast";
import { ORDER_STATUS_META } from "~/lib/accountData";
import { formatAddress } from "~/lib/checkoutData";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";
import { canCancelOrder, canRequestReturn, formatEventTime, formatOrderDate } from "~/lib/orderTracking";
import type { Order } from "~/lib/types";

// Same Kobalte Dialog SSR/hydration workaround as ProductCard's QuickAddSheet.
const CancelOrderDialog = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.CancelOrderDialog })));
const ReturnRequestDialog = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.ReturnRequestDialog })));

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
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 pb-10 pt-4">
        <Container width="wide" class="flex flex-col gap-4">
          <Breadcrumb items={[{ label: "หน้าแรก", href: "/" }, { label: "ประวัติการซื้อ", href: "/account" }, { label: `#${orderId()}` }]} />
          <Show when={auth.isAuthenticated()} fallback={<AccountGuestPrompt />}>
            <Show when={history.ready()} fallback={<div class="h-64 animate-pulse rounded-card bg-white" aria-hidden="true" />}>
              <Show when={order()} fallback={<OrderNotFound id={orderId()} />}>
                {(o) => <OrderDetail order={o()} onCancel={() => history.cancel(o().id)} onReturn={(r) => history.requestReturn(o().id, r)} />}
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
  onCancel: () => Promise<void>;
  onReturn: (request: Parameters<ReturnType<typeof createOrderHistory>["requestReturn"]>[1]) => Promise<void>;
}) {
  const [cancelOpen, setCancelOpen] = createSignal(false);
  const [returnOpen, setReturnOpen] = createSignal(false);
  const meta = () => ORDER_STATUS_META[props.order.status];
  const showTracking = () => !["pending_payment", "cancelled"].includes(props.order.status);
  const p = () => props.order.payment;

  return (
    <div class="flex flex-col gap-4">
      {/* Title + current order status */}
      <div class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 class="text-xl font-bold text-ink sm:text-2xl">คำสั่งซื้อ #{props.order.id}</h1>
          <p class="text-sm text-ink-gray">สั่งซื้อเมื่อ {formatEventTime(props.order.placedAt) || formatOrderDate(props.order.placedAt)}</p>
        </div>
        <span class={`w-fit rounded-pill px-3 py-1 text-sm font-semibold ${meta().badgeClass}`}>{meta().label}</span>
      </div>

      <Show when={props.order.status === "cancelled"}>
        <Banner tone="neutral">
          คำสั่งซื้อนี้ถูกยกเลิกแล้ว
          <Show when={props.order.cancelledAt}> เมื่อ {formatEventTime(props.order.cancelledAt!)}</Show>
        </Banner>
      </Show>
      <Show when={props.order.status === "pending_payment"}>
        <Banner tone="warning">รอชำระเงิน — ระบบจะเริ่มเตรียมและจัดส่งสินค้าหลังชำระเงินเรียบร้อย</Banner>
      </Show>
      <Show when={props.order.returnRequest}>
        {(r) => (
          <Banner tone="warning">
            ส่งคำขอคืนสินค้าแล้วเมื่อ {formatEventTime(r().requestedAt)} · รอทีมงานตรวจสอบ
            <span class="block text-xs text-ink-gray">เหตุผล: {r().reason}</span>
          </Banner>
        )}
      </Show>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div class="flex flex-col gap-4">
          <Show when={showTracking()}>
            <OrderTrackingTimeline shipment={props.order.shipment} />
          </Show>

          <section aria-labelledby="order-items-heading" class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-6">
            <h2 id="order-items-heading" class="text-lg font-semibold text-ink">
              สินค้า ({props.order.items.reduce((n, i) => n + i.qty, 0)} ชิ้น)
            </h2>
            <For each={props.order.items}>
              {(item) => (
                <div class="flex items-center gap-3">
                  <img src={item.image} alt="" loading="lazy" class="size-16 shrink-0 rounded-2xl border border-surface-gray object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="line-clamp-2 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                    <p class="text-xs text-ink-gray">
                      {item.variantLabel} · {formatTHB(item.price)} x {item.qty}
                    </p>
                  </div>
                  <p class="shrink-0 text-sm font-semibold text-ink">{formatTHB(item.price * item.qty)}</p>
                </div>
              )}
            </For>
          </section>
        </div>

        <div class="flex flex-col gap-4">
          <section aria-labelledby="order-address-heading" class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:p-6">
            <h2 id="order-address-heading" class="text-lg font-semibold text-ink">
              ที่อยู่จัดส่ง
            </h2>
            <p class="text-sm font-semibold text-ink">
              {props.order.shippingAddress.recipientName} <span class="font-normal text-ink-gray">· {props.order.shippingAddress.phone}</span>
            </p>
            <p class="text-sm text-ink">{formatAddress(props.order.shippingAddress)}</p>
          </section>

          <section aria-labelledby="order-payment-heading" class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:p-6">
            <h2 id="order-payment-heading" class="text-lg font-semibold text-ink">
              สรุปการชำระเงิน
            </h2>
            <Row label="ช่องทางชำระเงิน" value={p().method} />
            <Row label="การจัดส่ง" value={`${props.order.shipment.method} (DHL)`} />
            <div class="my-1 h-px bg-surface-gray" />
            <Row label="ราคาสินค้า" value={formatTHB(p().subtotal)} />
            <Row label="ค่าจัดส่ง" value={p().shippingFee ? formatTHB(p().shippingFee) : "ฟรี"} />
            <Show when={p().discount > 0}>
              <Row label="ส่วนลดคูปอง" value={`-${formatTHB(p().discount)}`} accent />
            </Show>
            <Show when={p().coinDiscount > 0}>
              <Row label="ส่วนลด Charmiss Coin" value={`-${formatTHB(p().coinDiscount)}`} accent />
            </Show>
            <div class="flex items-center justify-between border-t border-surface-gray pt-2">
              <span class="font-semibold text-ink">ยอดรวมทั้งหมด</span>
              <span class="text-lg font-bold text-brand-pink">{formatTHB(props.order.total)}</span>
            </div>
          </section>

          <Show when={canCancelOrder(props.order) || canRequestReturn(props.order)}>
            <div class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card sm:p-6">
              <Show when={canRequestReturn(props.order)}>
                <Button type="button" variant="outline" size="lg" class="w-full" onClick={() => setReturnOpen(true)}>
                  ขอคืนสินค้า
                </Button>
              </Show>
              <Show when={canCancelOrder(props.order)}>
                <Button type="button" variant="outline" size="lg" class="w-full !border-system-red !text-system-red" onClick={() => setCancelOpen(true)}>
                  ยกเลิกคำสั่งซื้อ
                </Button>
                <p class="text-center text-xs text-ink-gray">ยกเลิกได้จนกว่าจะส่งมอบพัสดุให้ขนส่ง</p>
              </Show>
            </div>
          </Show>

          <Button href="/account" variant="outline" class="w-full lg:hidden">
            ← กลับไปที่ประวัติการซื้อ
          </Button>
        </div>
      </div>

      <CancelOrderDialog
        order={props.order}
        open={cancelOpen()}
        onOpenChange={setCancelOpen}
        onConfirm={async () => {
          await props.onCancel();
          pushToast(`ยกเลิกคำสั่งซื้อ #${props.order.id} แล้ว`);
        }}
      />
      <ReturnRequestDialog order={props.order} open={returnOpen()} onOpenChange={setReturnOpen} onSubmit={props.onReturn} />
    </div>
  );
}

function Row(props: { label: string; value: string; accent?: boolean }) {
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
    <div class="rounded-card px-4 py-3 text-sm text-ink" classList={{ "bg-surface-gray": props.tone === "neutral", "bg-[#fff4e6]": props.tone === "warning" }} role="status">
      {props.children}
    </div>
  );
}

function OrderNotFound(props: { id: string }) {
  return (
    <div class="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-16 text-center shadow-card">
      <p class="text-lg font-semibold text-ink">ไม่พบคำสั่งซื้อ #{props.id}</p>
      <p class="text-sm text-ink-gray">คำสั่งซื้อนี้อาจไม่มีอยู่ หรือไม่ได้อยู่ในบัญชีของคุณ</p>
      <A href="/account" class="text-brand-pink underline">
        กลับไปที่ประวัติการซื้อ
      </A>
    </div>
  );
}
