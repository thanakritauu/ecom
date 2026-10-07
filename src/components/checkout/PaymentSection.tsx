import { For, Show, type JSX } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import { FAILURE_MESSAGES, type PaymentFailureReason } from "~/lib/payment";
import { Button } from "../shared/Button";
import { formatTHB } from "../shared/PriceDisplay";
import type { CheckoutPayment } from "./checkoutPayment";
import visaMark from "~/assets/icons/payment/visa.svg";
import mastercardMark from "~/assets/icons/payment/mastercard.svg";
import promptPayMark from "~/assets/icons/payment/promptpay.png";
import trueMoneyMark from "~/assets/icons/payment/truemoney.png";
import { CheckIcon } from "../shared/icons";

/**
 * One-page Checkout — payment, right after the billing address: pick a
 * method (card / PromptPay / TrueMoney) and pay with the button at the end
 * of this form. The card number / QR / wallet are entered on Beam's payment
 * page (new window); this section then waits for its result. State and the
 * pay action live in `createCheckoutPayment`, shared with the mobile floating bar.
 */
export function PaymentSection(props: {
  payment: CheckoutPayment;
  amount: number;
  disabled?: boolean;
  /** Shown right above the pay button (e.g. "an item went out of stock"). */
  notice?: JSX.Element;
  submitError?: string;
}) {
  const p = props.payment;
  const methodHint = () => METHOD_HINT[p.method()];

  return (
    <section aria-labelledby="payment-method-heading" class="relative flex w-full flex-col gap-4">
      <h2 id="payment-method-heading" class="scroll-mt-28 text-lg font-semibold text-ink">
        เลือกช่องทางชำระเงิน
      </h2>

      <Show
        when={p.phase() !== "failed"}
        fallback={<FailedPanel reason={p.failure()} methodLabel={p.methodLabel()} onRetry={p.retry} onChangeMethod={p.changeMethod} />}
      >
        {/* Phones: full-width rows (3 tiles across leave ~70px — "(PromptPay)" alone is 81px). From `sm`: the tile row. */}
        <div role="radiogroup" aria-labelledby="payment-method-heading" class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <For each={PAYMENT_METHODS}>
            {(m) => (
              <button
                type="button"
                role="radio"
                aria-checked={p.method() === m.id}
                disabled={p.waiting()}
                onClick={() => p.setMethod(m.id)}
                class="font-normal relative flex min-h-[56px] items-center gap-3 rounded-card border-2 py-3 pl-4 pr-11 text-left transition-colors duration-150 disabled:opacity-60 sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-between sm:gap-2 sm:p-4"
                classList={{
                  "border-brand-pink bg-surface-pink": p.method() === m.id,
                  "border-surface-gray bg-white lg:hover:border-brand-pink/40": p.method() !== m.id,
                }}
              >
                <MethodMark id={m.id} active={p.method() === m.id} />
                <span class="text-sm font-semibold leading-snug text-ink">
                  <Show when={"shortLabel" in m && m.shortLabel} fallback={m.label}>
                    <span class="sm:hidden">{"shortLabel" in m ? m.shortLabel : ""}</span>
                    <span class="hidden sm:inline">{m.label}</span>
                  </Show>
                </span>
                <Show when={p.method() === m.id}>
                  <span class="absolute right-4 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-pill bg-brand-pink text-white sm:right-2 sm:top-2 sm:translate-y-0" aria-hidden="true">
                    <CheckIcon class="size-3.5" />
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>

        <Show
          when={p.waiting()}
          fallback={
            <p class="rounded-card bg-surface-gray/60 p-4 text-sm leading-[1.75] text-ink-gray">
              กด <span class="font-semibold text-ink">“ชำระเงิน”</span> ระบบจะเปิดหน้าชำระเงินของ Beam ในหน้าต่างใหม่ เพื่อ{methodHint()} {formatTHB(props.amount)}
            </p>
          }
        >
          <WaitingPanel windowClosed={p.windowClosed()} onReopen={p.reopen} onCancel={p.cancelWaiting} />
        </Show>
      </Show>

      {props.notice}

      <Show when={props.submitError}>
        <p class="text-sm text-system-red" role="alert">
          {props.submitError}
        </p>
      </Show>

      {/* The pay button — end of the payment form (moved here from the order-summary box). */}
      <Show when={p.phase() === "form"}>
        <Button type="button" variant="primary" size="lg" class="w-full" disabled={props.disabled} onClick={p.pay}>
          ชำระเงิน {formatTHB(props.amount)}
        </Button>
      </Show>
      <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink-gray">
        <LockIcon /> ชำระเงินอย่างปลอดภัย ข้อมูลของคุณถูกเข้ารหัส
      </p>

    </section>
  );
}

function FailedPanel(props: { reason: PaymentFailureReason; methodLabel: string; onRetry: () => void; onChangeMethod: () => void }) {
  const msg = () => FAILURE_MESSAGES[props.reason];
  return (
    <div class="flex flex-col items-center gap-3 rounded-card border border-surface-gray px-4 py-6 text-center" role="alert">
      <span class="flex size-14 items-center justify-center rounded-pill bg-danger-soft text-2xl font-bold text-danger-strong" aria-hidden="true">
        !
      </span>
      <h3 class="text-xl font-bold text-ink">ไม่สามารถชำระเงินได้</h3>
      <p class="font-semibold text-ink">{msg().title}</p>
      <p class="max-w-sm text-sm text-ink-gray">{msg().body}</p>
      <p class="text-xs text-ink-gray">ช่องทาง: {props.methodLabel} · ยังไม่มีการตัดเงินจากรายการนี้</p>
      <div class="mt-2 flex w-full max-w-sm flex-col gap-2">
        <Button type="button" variant="primary" size="lg" class="w-full" onClick={props.onRetry}>
          ลองอีกครั้ง
        </Button>
        <Button type="button" variant="outline" size="lg" class="w-full" onClick={props.onChangeMethod}>
          เปลี่ยนช่องทางชำระเงิน
        </Button>
      </div>
    </div>
  );
}

/**
 * Each method's mark, in a fixed-width slot on phones (rows line their labels up), top of the tile from `sm`:
 * card = small Visa / Mastercard; PromptPay and TrueMoney = their own logos.
 */
function MethodMark(props: { id: PaymentMethodId; active: boolean }) {
  return (
    <span class="flex h-7 w-[100px] shrink-0 items-center gap-1.5 sm:w-auto" aria-hidden="true">
      <Show when={props.id === "card"}>
        <img src={visaMark} alt="" class="h-5 w-auto rounded-[3px]" />
        <img src={mastercardMark} alt="" class="h-5 w-auto rounded-[3px]" />
      </Show>
      <Show when={props.id === "promptpay"}>
        <img src={promptPayMark} alt="" class="h-6 w-auto" />
      </Show>
      <Show when={props.id === "truemoney"}>
        <img src={trueMoneyMark} alt="" class="h-5 w-auto" />
      </Show>
    </span>
  );
}

/** What happens on Beam's page for each method — completes "…เพื่อ" in the hint under the selector. */
const METHOD_HINT: Record<PaymentMethodId, string> = {
  card: "กรอกข้อมูลบัตรและชำระ",
  promptpay: "สแกน QR พร้อมเพย์ผ่านแอปธนาคารและชำระ",
  truemoney: "ยืนยันการชำระผ่าน TrueMoney Wallet",
};

/** Beam is open in another window — this page waits for its result (or the shopper re-opens / cancels it). */
function WaitingPanel(props: { windowClosed: boolean; onReopen: () => void; onCancel: () => void }) {
  return (
    <div class="flex flex-col items-center gap-3 rounded-card border border-surface-gray px-4 py-6 text-center" role="status" aria-live="polite">
      <span class="loading loading-spinner loading-lg text-brand-pink" aria-hidden="true" />
      <p class="font-semibold leading-[1.75] text-ink">กำลังรอการชำระเงินที่หน้าต่าง Beam…</p>
      <p class="max-w-sm text-sm leading-[1.75] text-ink-gray">
        <Show when={props.windowClosed} fallback="ชำระเงินให้เสร็จในหน้าต่างที่เปิดขึ้น แล้วหน้านี้จะอัปเดตเอง">
          หน้าต่าง Beam ถูกปิดไปแล้ว หากยังไม่ได้ชำระ กดเปิดหน้าชำระเงินอีกครั้ง
        </Show>
      </p>
      <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <button type="button" onClick={props.onReopen} class="min-h-11 text-sm font-medium text-brand-pink underline">
          เปิดหน้าชำระเงินอีกครั้ง
        </button>
        <button type="button" onClick={props.onCancel} class="min-h-11 text-sm font-medium text-ink-gray underline">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
