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
 * of this form (desktop) or the floating bar. The card number / QR / wallet are entered on Beam's payment
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
  /** Right after the method list (Checkout below `lg`: the "ส่วนลดและสิทธิพิเศษ" box, so coupons come before paying). */
  afterMethods?: JSX.Element;
  /** Checkout: the floating bar pays on phones / tablets, so this button shows from `lg` only. The pay-later page has no bar and keeps it everywhere. */
  payButtonDesktopOnly?: boolean;
}) {
  const p = props.payment;
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
        {/* 2x2 tiles at every size: icons on top (bank icons wrap, never overlap), the name under them, tick top-right. */}
        <div role="radiogroup" aria-labelledby="payment-method-heading" class="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-3">
          <For each={PAYMENT_METHODS}>
            {(m) => (
              <button
                type="button"
                role="radio"
                aria-checked={p.method() === m.id}
                disabled={p.waiting()}
                onClick={() => p.setMethod(m.id)}
                class="font-normal relative flex h-full flex-col items-start gap-2 rounded-card border-2 p-3 pr-9 text-left transition-colors duration-150 disabled:opacity-60 sm:p-4 sm:pr-10"
                classList={{
                  "border-brand-pink bg-surface-pink": p.method() === m.id,
                  "border-surface-gray bg-white lg:hover:border-brand-pink/40": p.method() !== m.id,
                }}
              >
                <MethodMark id={m.id} />
                {/* keep-all: Thai only breaks at the zero-width space below ("โมบายล์ | แบงก์กิ้ง"), never mid-word. */}
                <span class="min-w-0 text-sm font-semibold leading-[1.75] text-ink [word-break:keep-all] sm:text-base">{breakableLabel(m.label)}</span>
                <Show when={p.method() === m.id}>
                  {/* Tick in the top-right corner, inside the right padding every tile reserves for it. */}
                  <span class="absolute right-3 top-3 flex size-5 items-center justify-center rounded-pill bg-brand-pink text-white" aria-hidden="true">
                    <CheckIcon class="size-3" />
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>

        <Show when={p.waiting()}>
          <WaitingPanel windowClosed={p.windowClosed()} onReopen={p.reopen} onCancel={p.cancelWaiting} />
        </Show>
      </Show>

      {props.afterMethods}

      {props.notice}

      <Show when={props.submitError}>
        <p class="text-sm text-system-red" role="alert">
          {props.submitError}
        </p>
      </Show>

      {/* The pay button ends the form (Checkout: desktop only, see `payButtonDesktopOnly`). */}
      <Show when={p.phase() === "form"}>
        <div classList={{ "hidden lg:block": !!props.payButtonDesktopOnly }}>
          <Button type="button" variant="primary" size="lg" class="w-full" disabled={props.disabled} onClick={p.pay}>
            ชำระเงิน {formatTHB(props.amount)}
          </Button>
        </div>
      </Show>

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
      <p class="text-xs leading-[1.75] text-ink-gray">ชำระผ่าน {props.methodLabel} ระบบยังไม่ได้ตัดเงินจากรายการนี้</p>
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
            ระบบบันทึกคำสั่งซื้อไว้แล้ว ชำระได้ที่เมนู<span class="font-semibold">โปรไฟล์</span> หัวข้อ<span class="font-semibold">ประวัติการซื้อ</span>{" "}
            ในแท็บ<span class="font-semibold">รอชำระเงิน</span>
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
      class="flex w-full min-w-0 items-center gap-1"
      role={banks() ? "list" : undefined}
      aria-label={banks() ? "ธนาคารที่รองรับ" : undefined}
      aria-hidden={banks() ? undefined : "true"}
    >
      <Show
        when={banks()}
        fallback={<For each={METHOD_ICONS[props.id]}>{(src) => <img src={src} alt="" class="size-8" />}</For>}
      >
        {/* One row at every size. Each slot is 32px and may shrink (the icon inside never does), so the icons only
            overlap when the tile is too narrow for all five; with room they sit side by side. The last one never
            shrinks, so nothing spills out of the tile. */}
        <span class="flex w-full min-w-0 items-center gap-1">
          <For each={PAYMENT_BANKS}>
            {(bank, i) => (
              <span role="listitem" class="flex min-w-0 basis-8" classList={{ "shrink-0": i() === PAYMENT_BANKS.length - 1, shrink: i() < PAYMENT_BANKS.length - 1 }}>
                <img src={bank.src} alt={bank.name} title={bank.name} class="size-8 max-w-none shrink-0" />
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

/** Beam is open in another window — this page waits for its result (or the shopper re-opens / cancels it). */
function WaitingPanel(props: { windowClosed: boolean; onReopen: () => void; onCancel: () => void }) {
  return (
    <div class="flex flex-col items-center gap-3 rounded-card border border-surface-gray px-4 py-6 text-center" role="status" aria-live="polite">
      <span class="loading loading-spinner loading-lg text-brand-pink" aria-hidden="true" />
      <p class="font-semibold leading-[1.75] text-ink">กำลังรอการชำระเงินที่หน้าต่าง Beam...</p>
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
