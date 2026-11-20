import { createSignal, onMount, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { EmptyState } from "~/components/shared/EmptyState";
import { DocumentIcon } from "~/components/shared/icons";
import { OrderSuccess, readOrderSuccess, type OrderSuccessData } from "~/components/checkout/OrderSuccess";
import { useAuth } from "~/lib/auth";

/**
 * "ชำระเงินสำเร็จ" at its own URL (`/order-success/ORD-...`): Checkout lands here once Beam confirms the payment.
 * The paid order is read back from this browser tab (`saveOrderSuccess`), so a refresh keeps it; without it
 * (another browser, a shared link) the page says so and points to the purchase history.
 */
export default function OrderSuccessPage() {
  const params = useParams();
  const auth = useAuth();
  const [data, setData] = createSignal<OrderSuccessData>();
  const [ready, setReady] = createSignal(false);

  // Read after mount: SSR has no tab storage, and the first client paint must match it.
  onMount(() => {
    setData(readOrderSuccess(params.id ?? ""));
    setReady(true);
  });

  return (
    <>
      <Header minimal />
      <main class="flex flex-col overflow-x-clip bg-surface-gray/60 py-6">
        <Container width="wide">
          <Show when={ready()} fallback={<div class="mx-auto h-96 w-full max-w-[560px] animate-pulse rounded-card bg-white" aria-hidden="true" />}>
            <Show
              when={data()}
              fallback={
                <div class="mx-auto w-full max-w-[560px] rounded-card bg-white shadow-card">
                  <EmptyState
                    icon={DocumentIcon}
                    title="ไม่พบข้อมูลการชำระเงินนี้"
                    description={`ดูสถานะคำสั่งซื้อ ${params.id ?? ""} ได้ที่ประวัติการซื้อ`}
                    action={{ label: "ดูประวัติการซื้อ", href: "/account" }}
                  />
                </div>
              }
            >
              {(d) => <OrderSuccess {...d()} isMember={auth.isAuthenticated()} />}
            </Show>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}
