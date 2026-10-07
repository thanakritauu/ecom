import { createSignal, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { Button } from "~/components/shared/Button";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { CheckIcon } from "~/components/shared/icons";
import { AccountGuestPrompt } from "~/components/account/AccountGuestPrompt";
import { OrderItemMeta, OrderItemPrice } from "~/components/account/OrderCard";
import { PaymentSection } from "~/components/checkout/PaymentSection";
import { createCheckoutPayment } from "~/components/checkout/checkoutPayment";
import { useAuth } from "~/lib/auth";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";
import type { Order } from "~/lib/types";

/**
 * Pay a "รอชำระเงิน" order again — the same payment section and Beam
 * payment-window flow as Checkout (`PaymentSection` + `createCheckoutPayment`),
 * for an order that already exists, so nothing about the cart or addresses is asked again.
 */
export default function OrderPayPage() {
  const auth = useAuth();
  const params = useParams();
  const history = createOrderHistory(() => createMockOrderRepository());
  const orderId = () => params.id ?? "";
  const order = () => history.getById(orderId());
  const detailHref = () => `/account/orders/${orderId()}`;

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-clip bg-surface-gray/60 pb-6 pt-4">
        <Container width="wide" class="flex flex-col gap-4">
          <Breadcrumb
            items={[
              { label: "หน้าแรก", href: "/" },
              { label: "ประวัติการซื้อ", href: "/account" },
              { label: orderId(), href: detailHref() },
              { label: "ชำระเงิน" },
            ]}
          />
          <Show when={auth.isAuthenticated()} fallback={<AccountGuestPrompt />}>
            <Show when={history.ready()} fallback={<div class="h-64 animate-pulse rounded-card bg-white" aria-hidden="true" />}>
              <Show
                when={order()}
                fallback={<Notice title={`ไม่พบคำสั่งซื้อ ${orderId()}`} body="คำสั่งซื้อนี้อาจไม่มีอยู่ หรือไม่ได้อยู่ในบัญชีของคุณ" href="/account" cta="กลับไปที่ประวัติการซื้อ" />}
              >
                {(o) => <PayOrder order={o()} onPaid={(method) => history.markPaid(o().id, method)} detailHref={detailHref()} />}
              </Show>
            </Show>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function PayOrder(props: { order: Order; onPaid: (methodLabel: string) => Promise<void>; detailHref: string }) {
  // Snapshot: once paid the order leaves "รอชำระเงิน", but this page keeps showing its success state.
  const [paid, setPaid] = createSignal(false);
  const payment = createCheckoutPayment({
    amount: () => props.order.total,
    orderNumber: () => props.order.id,
    validateOrder: () => true,
    onPaid: async (result) => {
      await props.onPaid(result.methodLabel);
      setPaid(true);
      window.scrollTo({ top: 0 });
    },
    returnPath: () => `/account/orders/${props.order.id}/pay`,
  });

  return (
    <Show
      when={!paid()}
      fallback={<Notice success title="ชำระเงินสำเร็จ" body={`คำสั่งซื้อ ${props.order.id} · ${formatTHB(props.order.total)} — เรากำลังเตรียมการจัดส่งให้คุณ`} href={props.detailHref} cta="ดูรายละเอียดคำสั่งซื้อ" />}
    >
      <Show
        when={props.order.status === "pending_payment"}
        fallback={<Notice title="คำสั่งซื้อนี้ไม่ต้องชำระเงินแล้ว" body="คำสั่งซื้อนี้ชำระเงินแล้ว หรือถูกยกเลิกไปแล้ว" href={props.detailHref} cta="ดูรายละเอียดคำสั่งซื้อ" />}
      >
        <div class="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
          {/* What's being paid for */}
          <section aria-labelledby="pay-order-heading" class="flex w-full flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-6 lg:w-[360px] lg:shrink-0">
            <h1 id="pay-order-heading" class="text-xl font-bold text-ink">
              ชำระเงินคำสั่งซื้อ {props.order.id}
            </h1>
            <For each={props.order.items}>
              {(item) => (
                <div class="flex items-center gap-3">
                  <img src={item.image} alt="" loading="lazy" class="size-12 shrink-0 rounded-xl border border-surface-gray object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                    <OrderItemMeta item={item} />
                  </div>
                  <OrderItemPrice item={item} />
                </div>
              )}
            </For>
            <div class="flex items-center justify-between border-t border-surface-gray pt-3">
              <span class="font-semibold text-ink">ยอดชำระ</span>
              <span class="text-lg font-bold text-brand-pink">{formatTHB(props.order.total)}</span>
            </div>
          </section>

          <div class="flex min-w-0 flex-1 flex-col gap-4 rounded-card bg-white p-4 shadow-card lg:p-6">
            <PaymentSection payment={payment} amount={props.order.total} />
          </div>
        </div>
      </Show>
    </Show>
  );
}

function Notice(props: { title: string; body: string; href: string; cta: string; success?: boolean }) {
  return (
    <div class="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-card bg-white px-6 py-12 text-center shadow-card" role="status">
      <Show when={props.success}>
        <div class="flex size-16 items-center justify-center rounded-pill bg-success-soft text-success">
          <CheckIcon class="size-8" />
        </div>
      </Show>
      <h1 class="text-2xl font-bold text-ink">{props.title}</h1>
      <p class="max-w-sm text-ink-gray">{props.body}</p>
      <Button href={props.href} variant="primary" size="lg" class="mt-2 w-full max-w-sm">
        {props.cta}
      </Button>
      <A href="/account" class="text-sm text-brand-pink underline">
        กลับไปที่ประวัติการซื้อ
      </A>
    </div>
  );
}
