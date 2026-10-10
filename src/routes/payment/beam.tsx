import { createSignal, For, onMount, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Button } from "~/components/shared/Button";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { PAYMENT_METHODS } from "~/lib/cartSelectors";
import { METHOD_ICONS } from "~/components/checkout/paymentMarks";
import { reportBeamResult, safeReturnPath, BEAM_RESULT_TYPE, type PaymentResult } from "~/lib/payment";

/**
 * MOCK of Beam's hosted payment page — what `openBeamCheckout()` opens in a
 * new window. Rendered without the store Header/Footer (it stands in for a
 * third-party page) and deliberately plain: text only, no Beam logo or
 * branding. The URL carries only order ref, amount, method and the return
 * path. The two buttons stand in for whatever the shopper does on Beam's
 * real page (card form / PromptPay QR / TrueMoney approval); the result goes
 * back to the opener via `postMessage` (+ localStorage fallback), then this
 * window closes — or, in same-tab mode, redirects back to `?return=`.
 */
export default function BeamCheckoutMockPage() {
  const [params] = useSearchParams();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const orderRef = () => one(params.ref) ?? "";
  const amount = () => Number(one(params.amount));
  const method = () => PAYMENT_METHODS.find((m) => m.id === one(params.method));
  const valid = () => !!orderRef() && Number.isFinite(amount()) && amount() > 0 && !!method();

  const [status, setStatus] = createSignal<"idle" | "processing" | "done">("idle");
  const [doneText, setDoneText] = createSignal("");

  onMount(() => {
    document.title = "Beam Checkout (mock)";
  });

  const finish = (result: PaymentResult) => {
    const toOpener = reportBeamResult({ type: BEAM_RESULT_TYPE, orderRef: orderRef(), result });
    if (!toOpener) return window.location.replace(safeReturnPath(one(params.return)));
    setDoneText(result.status === "succeeded" ? "ชำระเงินสำเร็จ กลับไปที่หน้าร้านได้เลย" : "ยกเลิกการชำระเงินแล้ว กลับไปที่หน้าร้านได้เลย");
    setStatus("done");
    window.close();
  };

  const succeed = () => {
    setStatus("processing");
    // A short beat, like a gateway confirming the charge.
    setTimeout(
      () =>
        finish({
          status: "succeeded",
          reference: `BEAM-${Date.now().toString(36).toUpperCase()}`,
          method: method()!.id,
        }),
      900,
    );
  };

  return (
    <main class="flex min-h-screen flex-col items-center bg-surface-gray/60 px-4 py-8">
      <div class="flex w-full max-w-[440px] flex-col gap-4">
        <header class="flex flex-col items-center gap-1 text-center">
          <h1 class="text-2xl font-bold text-ink">Beam Checkout</h1>
          <p class="rounded-pill bg-warning-soft px-3 py-1 text-xs font-semibold leading-[1.75] text-ink">หน้าจำลองของ Beam (mock)</p>
        </header>

        <Show
          when={valid()}
          fallback={
            <section class="rounded-card bg-white p-6 text-center shadow-card" role="alert">
              <p class="font-semibold text-ink">ลิงก์ชำระเงินไม่ถูกต้อง</p>
              <p class="mt-1 text-sm leading-[1.75] text-ink-gray">กรุณากลับไปที่หน้าร้านแล้วกดชำระเงินอีกครั้ง</p>
            </section>
          }
        >
          <section aria-labelledby="beam-order-heading" class="flex flex-col gap-4 rounded-card bg-white p-5 shadow-card sm:p-6">
            <h2 id="beam-order-heading" class="sr-only">
              รายละเอียดการชำระเงิน
            </h2>
            <dl class="flex flex-col gap-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-ink-gray">ร้านค้า</dt>
                <dd class="font-semibold text-ink">Charmiss</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-ink-gray">หมายเลขคำสั่งซื้อ</dt>
                <dd class="font-semibold text-ink">{orderRef()}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-ink-gray">ช่องทางชำระเงิน</dt>
                <dd class="flex items-center justify-end gap-2 text-right text-ink">
                  {/* The method's own square icon(s) — the shopper's method, not Beam branding. */}
                  <span class="flex shrink-0 gap-1" aria-hidden="true">
                    <For each={METHOD_ICONS[method()!.id]}>{(src) => <img src={src} alt="" class="size-5" />}</For>
                  </span>
                  {method()!.label}
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3 border-t border-surface-gray pt-3">
                <dt class="font-semibold text-ink">ยอดชำระ</dt>
                <dd class="text-xl font-bold text-ink">{formatTHB(amount())}</dd>
              </div>
            </dl>

            <Show
              when={status() !== "done"}
              fallback={
                <p class="rounded-card bg-surface-gray/60 p-4 text-center text-sm leading-[1.75] text-ink" role="status">
                  {doneText()} ปิดหน้าต่างนี้ได้เลย
                </p>
              }
            >
              <p class="rounded-card bg-surface-gray/60 p-3 text-xs leading-[1.75] text-ink-gray">
                หน้านี้เป็นหน้าจำลองสำหรับทดสอบ ไม่มีการเรียกเก็บเงินจริง เลือกผลการชำระเงินที่ต้องการด้านล่างได้เลย
              </p>
              <div class="flex flex-col gap-2">
                <Button type="button" variant="primary" size="lg" class="w-full" loading={status() === "processing"} onClick={succeed}>
                  ชำระเงินสำเร็จ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  class="w-full"
                  disabled={status() === "processing"}
                  onClick={() => finish({ status: "failed", reason: "cancelled" })}
                >
                  ยกเลิกการชำระเงิน
                </Button>
              </div>
            </Show>
          </section>
        </Show>
      </div>
    </main>
  );
}
