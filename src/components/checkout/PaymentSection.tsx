import { For, Show, type JSX } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import { FAILURE_MESSAGES, type PaymentFailureReason } from "~/lib/payment";
import { Button } from "../shared/Button";
import { TextField } from "../shared/TextField";
import { formatTHB } from "../shared/PriceDisplay";
import { CardPaymentForm } from "../payment/CardPaymentForm";
import { PromptPayPanel } from "../payment/PromptPayPanel";
import type { CheckoutPayment } from "./checkoutPayment";
import visaMark from "~/assets/icons/payment/visa.svg";
import mastercardMark from "~/assets/icons/payment/mastercard.svg";
import promptPayMark from "~/assets/icons/payment/promptpay.png";
import trueMoneyMark from "~/assets/icons/payment/truemoney.png";
import { CheckIcon } from "../shared/icons";

/**
 * One-page Checkout — payment, right after the billing address: pick a
 * method (card / PromptPay / TrueMoney), fill it in, and pay with the button
 * at the end of this form (it was the summary box's button). State and the
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
                disabled={p.busy()}
                onClick={() => p.setMethod(m.id)}
                class="font-normal relative flex min-h-[56px] items-center gap-3 rounded-card border-2 py-3 pl-4 pr-11 text-left transition-colors duration-150 disabled:opacity-60 sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-between sm:gap-2 sm:p-4"
                classList={{
                  "border-brand-pink bg-surface-pink": p.method() === m.id,
                  "border-surface-gray bg-white hover:border-brand-pink/40": p.method() !== m.id,
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

        <Show when={p.method() === "card"}>
          {/* Saved cards (if any): pick one and confirm with its CVV, or switch to a new card. */}
          <Show when={p.savedCards().length > 0}>
            <div class="flex flex-col gap-2">
              <p id="saved-cards-heading" class="text-sm font-medium text-ink">
                บัตรที่บันทึกไว้
              </p>
              <div role="radiogroup" aria-labelledby="saved-cards-heading" class="flex flex-col gap-2">
                <For each={p.savedCards()}>
                  {(c) => (
                    <div
                      class="flex flex-col rounded-card border-2 transition-colors duration-150"
                      classList={{
                        "border-brand-pink bg-surface-pink": p.cardChoice() === c.id,
                        "border-surface-gray bg-white hover:border-brand-pink/40": p.cardChoice() !== c.id,
                      }}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={p.cardChoice() === c.id}
                        disabled={p.busy()}
                        onClick={() => p.pickCard(c.id)}
                        class="font-normal flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <RadioDot checked={p.cardChoice() === c.id} />
                        <Show when={BRAND_MARK[c.brand]} fallback={<span class="w-9 shrink-0 text-xs font-bold uppercase text-ink">{c.brand}</span>}>
                          {(src) => <img src={src()} alt="" class="h-6 w-auto shrink-0 rounded-[3px]" />}
                        </Show>
                        <span class="flex min-w-0 flex-1 flex-col">
                          <span class="text-sm font-semibold tracking-wider text-ink">•••• {c.last4}</span>
                          <span class="truncate text-xs text-ink-gray">
                            หมดอายุ {c.expiry} · {c.holder}
                          </span>
                        </span>
                        <span class="sr-only">{`บัตร ${c.brand} ลงท้าย ${c.last4}`}</span>
                      </button>
                      <Show when={p.cardChoice() === c.id}>
                        <div class="px-4 pb-4">
                          <div class="sm:max-w-[220px]">
                            <TextField
                              label="CVV ของบัตรนี้"
                              required
                              type="password"
                              inputMode="numeric"
                              autocomplete="cc-csc"
                              placeholder="•••"
                              maxlength={4}
                              disabled={p.busy()}
                              value={p.savedCvv()}
                              onInput={(e) => p.setSavedCvv(e.currentTarget.value.replace(/\D/g, ""))}
                              onBlur={p.touchSavedCvv}
                              error={p.savedCvvError()}
                            />
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
                <button
                  type="button"
                  role="radio"
                  aria-checked={p.cardChoice() === "new"}
                  disabled={p.busy()}
                  onClick={() => p.pickCard("new")}
                  class="font-normal flex min-h-[56px] w-full items-center gap-3 rounded-card border-2 px-4 py-3 text-left transition-colors duration-150"
                  classList={{
                    "border-brand-pink bg-surface-pink": p.cardChoice() === "new",
                    "border-surface-gray bg-white hover:border-brand-pink/40": p.cardChoice() !== "new",
                  }}
                >
                  <RadioDot checked={p.cardChoice() === "new"} />
                  <span class="text-sm font-semibold text-ink">ใช้บัตรใบใหม่</span>
                </button>
              </div>
            </div>
          </Show>

          <Show when={p.cardChoice() === "new"}>
            <CardPaymentForm card={p.card()} onChange={p.setCard} errors={p.cardErrors()} onBlurField={p.touchCard} disabled={p.busy()} />
            <Show when={p.canSaveCard()}>
              <label class="-mt-1 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={p.saveNewCard()}
                  disabled={p.busy()}
                  onChange={(e) => p.setSaveNewCard(e.currentTarget.checked)}
                  class="size-5 shrink-0 rounded accent-brand-pink"
                />
                บันทึกบัตรนี้ไว้ใช้ครั้งต่อไป
              </label>
            </Show>
          </Show>
        </Show>

        <Show when={p.method() === "promptpay"}>
          <Show
            when={p.ppSession()}
            fallback={
              <p class="rounded-card bg-surface-gray/60 p-4 text-sm text-ink-gray">
                กด <span class="font-semibold text-ink">“ชำระเงิน”</span> เพื่อสร้าง QR Code แล้วสแกนจ่าย {formatTHB(props.amount)} ผ่านแอปธนาคาร
              </p>
            }
          >
            <PromptPayPanel
              amount={props.amount}
              qrPayload={p.ppSession()?.qrPayload}
              secondsLeft={p.secondsLeft()}
              status={p.ppStatus() === "confirming" ? "confirming" : "pending"}
              notPaidYetHint={p.notPaidHint()}
            />
          </Show>
        </Show>

        <Show when={p.method() === "truemoney"}>
          <TextField
            label="เบอร์มือถือที่ผูกกับ TrueMoney Wallet"
            required
            type="tel"
            inputMode="tel"
            autocomplete="tel"
            placeholder="08X-XXX-XXXX"
            maxlength={12}
            disabled={p.busy()}
            value={p.walletPhone()}
            onInput={(e) => p.setWalletPhone(e.currentTarget.value.replace(/[^\d-]/g, ""))}
            onBlur={p.touchWallet}
            error={p.walletError()}
          />
          <p class="-mt-2 text-xs text-ink-gray">หลังกดชำระเงิน ระบบจะส่งคำขอชำระ {formatTHB(props.amount)} ไปที่แอป TrueMoney ของเบอร์นี้ ให้กดยืนยันในแอป</p>
        </Show>
      </Show>

      {props.notice}

      <Show when={props.submitError}>
        <p class="text-sm text-system-red" role="alert">
          {props.submitError}
        </p>
      </Show>

      {/* The pay button — end of the payment form (moved here from the order-summary box). */}
      <Show when={p.phase() !== "failed"}>
        <Button
          type="button"
          variant="primary"
          size="lg"
          class="w-full"
          loading={p.busy()}
          disabled={props.disabled}
          onClick={() => void p.pay()}
        >
          {p.busy() ? p.ctaLoadingLabel() : p.ctaLabel() === "ชำระเงิน" ? `ชำระเงิน ${formatTHB(props.amount)}` : p.ctaLabel()}
        </Button>
      </Show>
      <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink-gray">
        <LockIcon /> ชำระเงินอย่างปลอดภัย ข้อมูลของคุณถูกเข้ารหัส
      </p>

      {/* Card / TrueMoney processing — locks the form until the (mock) gateway answers. */}
      <Show when={p.phase() === "processing"}>
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-card bg-white/90 px-6 text-center" role="status" aria-live="assertive">
          <span class="loading loading-spinner loading-lg text-brand-pink" aria-hidden="true" />
          <p class="text-lg font-semibold text-ink">{p.method() === "truemoney" ? "รอการยืนยันในแอป TrueMoney..." : "กำลังดำเนินการชำระเงิน..."}</p>
          <p class="text-sm text-ink-gray">กรุณาอย่าปิดหรือรีเฟรชหน้านี้</p>
        </div>
      </Show>
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

const BRAND_MARK: Partial<Record<string, string>> = { visa: visaMark, mastercard: mastercardMark };

function RadioDot(props: { checked: boolean }) {
  return (
    <span
      class="flex size-5 shrink-0 items-center justify-center rounded-pill border-2"
      classList={{ "border-brand-pink": props.checked, "border-ink-placeholder": !props.checked }}
      aria-hidden="true"
    >
      <Show when={props.checked}>
        <span class="size-2.5 rounded-pill bg-brand-pink" />
      </Show>
    </span>
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
