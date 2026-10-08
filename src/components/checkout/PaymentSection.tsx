import { createEffect, createSignal, For, on, onMount, Show, type JSX } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import { FAILURE_MESSAGES, type PaymentFailureReason } from "~/lib/payment";
import { Button } from "../shared/Button";
import { formatTHB } from "../shared/PriceDisplay";
import type { CheckoutPayment } from "./checkoutPayment";
import { CheckIcon } from "../shared/icons";
import { METHOD_ICONS, PAYMENT_BANKS } from "./paymentMarks";
import { WarningIcon } from "./WarningIcon";
import { PaymentFailedDialog } from "./PaymentFailedDialog";

/**
 * One-page Checkout — payment, right after the billing address: pick a
 * method (PromptPay / bank app / card / TrueMoney) and pay with the button at the end
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
  /**
   * Checkout only: the order is already saved as "รอชำระเงิน" once Beam opens, so a failed /
   * abandoned payment says where to pay it later. (The account pay-later page is that place — off there.)
   */
  payLaterHint?: boolean;
}) {
  const p = props.payment;
  const methodHint = () => METHOD_HINT[p.method()];
  // The pay-later alert sits at the top of this section — bring it into view when Beam's window is closed unpaid
  // (a failed/cancelled result already scrolls here, `createCheckoutPayment`'s `fail`).
  const unpaidWindowClosed = () => p.waiting() && p.windowClosed();
  createEffect(
    on(unpaidWindowClosed, (closed) => {
      if (closed && props.payLaterHint) document.getElementById("payment-method-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, { defer: true }),
  );

  // Beam came back cancelled / failed → a popup on top of the red inline boxes (which stay after it closes).
  // Not deferred: a same-tab return settles in the page's `onMount`, before this first runs.
  const [failedDialogOpen, setFailedDialogOpen] = createSignal(false);
  // Kobalte Dialog SSR/hydration issue (see the coupon / coin sheets) — the popup is only rendered after mount.
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));
  createEffect(on(p.phase, (phase, prev) => phase === "failed" && prev !== "failed" && setFailedDialogOpen(true)));

  return (
    <section aria-labelledby="payment-method-heading" class="relative flex w-full flex-col gap-4">
      <h2 id="payment-method-heading" class="scroll-mt-28 text-lg font-semibold text-ink">
        เลือกช่องทางชำระเงิน
      </h2>

      <Show when={props.payLaterHint && (p.phase() === "failed" || unpaidWindowClosed())}>
        <PayLaterAlert />
      </Show>

      <Show
        when={p.phase() !== "failed"}
        fallback={
          <FailedPanel
            reason={p.failure()}
            methodLabel={p.methodLabel()}
            onRetry={p.retry}
            onChangeMethod={p.changeMethod}
          />
        }
      >
        {/* Phones: one full-width row per method. From `sm`: 2×2 tiles, still icons + name on one row. */}
        <div role="radiogroup" aria-labelledby="payment-method-heading" class="grid grid-cols-1 gap-2 sm:auto-rows-fr sm:grid-cols-2 sm:gap-3">
          <For each={PAYMENT_METHODS}>
            {(m) => (
              <button
                type="button"
                role="radio"
                aria-checked={p.method() === m.id}
                disabled={p.waiting()}
                onClick={() => p.setMethod(m.id)}
                class="font-normal relative flex min-h-[64px] items-center gap-3 rounded-card border-2 py-4 pl-4 pr-10 text-left transition-colors duration-150 disabled:opacity-60 sm:min-h-[72px] sm:gap-4"
                classList={{
                  "border-brand-pink bg-surface-pink": p.method() === m.id,
                  "border-surface-gray bg-white lg:hover:border-brand-pink/40": p.method() !== m.id,
                }}
              >
                {/* Every method the same way at every size: icons first, then the name, one row — gaps match the DHL
                    box (12px phones / 16px from sm). All icons one size (32px phones / 40px from sm), banks included. */}
                <MethodMark id={m.id} />
                {/* Same 16px semibold as "จัดส่งโดย DHL". keep-all: Thai only breaks at the zero-width space below
                    ("โมบายล์ | แบงก์กิ้ง"), never mid-word. */}
                <span class="min-w-0 flex-1 text-base font-semibold leading-[1.75] text-ink [word-break:keep-all]">{breakableLabel(m.label)}</span>
                <Show when={p.method() === m.id}>
                  {/* Tick inside the frame, vertically centred in the 40px right padding every row reserves for it. */}
                  <span class="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-pill bg-brand-pink text-white" aria-hidden="true">
                    <CheckIcon class="size-3" />
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

      <Show when={mounted()}>
        <PaymentFailedDialog
          open={failedDialogOpen()}
          onOpenChange={setFailedDialogOpen}
          reason={p.failure()}
          onRetry={() => {
            setFailedDialogOpen(false);
            p.retry();
          }}
        />
      </Show>
    </section>
  );
}

/** Beam returned failed / cancelled — the DHL box's framed card in system red (border, light red fill, warning icon, red title). Stays after the popup closes. */
function FailedPanel(props: { reason: PaymentFailureReason; methodLabel: string; onRetry: () => void; onChangeMethod: () => void }) {
  const msg = () => FAILURE_MESSAGES[props.reason];
  return (
    <div role="alert" class="flex flex-col items-center gap-3 rounded-card border-2 border-system-red bg-danger-soft px-4 py-6 text-center">
      <span class="flex size-14 items-center justify-center rounded-pill bg-system-red text-white" aria-hidden="true">
        <WarningIcon class="size-7" />
      </span>
      <h3 class="text-xl font-bold leading-[1.75] text-system-red">ไม่สามารถชำระเงินได้</h3>
      <p class="font-semibold text-ink">{msg().title}</p>
      <p class="max-w-sm text-sm leading-[1.75] text-ink-gray">{msg().body}</p>
      <p class="text-xs leading-[1.75] text-ink-gray">ช่องทาง: {props.methodLabel} · ยังไม่มีการตัดเงินจากรายการนี้</p>
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
 * Checkout only — payment failed / was cancelled / Beam's window was closed unpaid, but the order
 * already exists as "รอชำระเงิน". Top of the payment section (scrolled into view), so it can't be
 * missed — same red frame as the failed panel. The button opens `/account?tab=pending_payment`.
 */
function PayLaterAlert() {
  return (
    <div role="alert" class="flex flex-col gap-3 rounded-card border-2 border-system-red bg-danger-soft p-4 sm:flex-row sm:items-center sm:gap-4">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-system-red text-white" aria-hidden="true">
          <WarningIcon class="size-5" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5 text-sm leading-[1.75]">
          <p class="text-base font-bold text-system-red">คำสั่งซื้อของคุณรอการชำระเงิน</p>
          <p class="text-ink">
            ระบบบันทึกคำสั่งซื้อไว้แล้ว สถานะ “รอชำระเงิน” ชำระได้ที่{" "}
            <span class="font-semibold">
              <span class="whitespace-nowrap">โปรไฟล์ ›</span> <span class="whitespace-nowrap">ประวัติการซื้อ ›</span>{" "}
              <span class="whitespace-nowrap">แท็บ “รอชำระเงิน”</span>
            </span>
          </p>
        </div>
      </div>
      <Button href="/account?tab=pending_payment" variant="primary" class="w-full shrink-0 sm:w-auto">
        ไปที่ประวัติการซื้อ
      </Button>
    </div>
  );
}

/**
 * Each method's square icon(s) — the official app icons from `paymentMarks.ts`, all the same size:
 * PromptPay / TrueMoney one icon, card Visa + Mastercard, the bank app its five banks.
 */
function MethodMark(props: { id: PaymentMethodId }) {
  const banks = () => props.id === "mobilebanking";
  return (
    <span
      class="flex shrink-0 items-center gap-1"
      role={banks() ? "list" : undefined}
      aria-label={banks() ? "ธนาคารที่รองรับ" : undefined}
      aria-hidden={banks() ? undefined : "true"}
    >
      <Show
        when={banks()}
        fallback={<For each={METHOD_ICONS[props.id]}>{(src) => <img src={src} alt="" class="size-8 sm:size-10" />}</For>}
      >
        {/* Same-size icons slightly overlapped (white ring) so the five banks leave room for the name — on phones and
            in the narrower 2×2 tiles from `sm`. */}
        <span class="flex items-center -space-x-2 sm:-space-x-2.5">
          <For each={PAYMENT_BANKS}>
            {(bank) => (
              <span role="listitem" class="rounded-[10px] ring-2 ring-white">
                <img src={bank.src} alt={bank.name} title={bank.name} class="size-8 sm:size-10" />
              </span>
            )}
          </For>
        </span>
      </Show>
    </span>
  );
}

/** Allows a line break only between the two words of "โมบายล์แบงก์กิ้ง" (paired with `word-break: keep-all`). */
const breakableLabel = (label: string) => label.replace("โมบายล์แบงก์กิ้ง", "โมบายล์\u200Bแบงก์กิ้ง");

/** What happens on Beam's page for each method — completes "…เพื่อ" in the hint under the selector. */
const METHOD_HINT: Record<PaymentMethodId, string> = {
  card: "กรอกข้อมูลบัตรและชำระ",
  promptpay: "สแกน QR พร้อมเพย์ผ่านแอปธนาคารและชำระ",
  mobilebanking: "เลือกธนาคารและยืนยันการโอนเงินในแอปธนาคาร",
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
