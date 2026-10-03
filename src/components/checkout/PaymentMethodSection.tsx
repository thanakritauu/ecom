import { For } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";

/**
 * Checkout's payment-method choice. Phase 06: card details (and the
 * PromptPay QR, etc.) are entered on the Beam-style payment step that
 * follows Checkout (`components/payment/PaymentStep.tsx`), so this section
 * only picks the method — it pre-selects that step, where it can still be
 * changed.
 */
export function PaymentMethodSection(props: { selected: PaymentMethodId; onSelect: (id: PaymentMethodId) => void }) {
  return (
    <section aria-labelledby="payment-method-heading" class="flex w-full flex-col gap-3">
      <h2 id="payment-method-heading" class="text-lg font-semibold text-ink">
        ช่องทางชำระเงิน
      </h2>
      <div role="radiogroup" aria-labelledby="payment-method-heading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <For each={PAYMENT_METHODS}>
          {(method) => (
            <button
              type="button"
              role="radio"
              aria-checked={props.selected === method.id}
              onClick={() => props.onSelect(method.id)}
              class="font-normal flex flex-1 items-center gap-2 rounded-card border p-4 text-left transition-colors duration-150"
              classList={{
                "border-brand-pink bg-surface-pink": props.selected === method.id,
                "border-surface-gray bg-white hover:border-brand-pink/50": props.selected !== method.id,
              }}
            >
              <span class="flex flex-1 flex-col gap-1">
                <span class="font-semibold text-ink">{method.label}</span>
                <span class="text-xs text-ink-gray">{method.description}</span>
              </span>
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-pill border"
                classList={{ "border-brand-pink": props.selected === method.id, "border-ink-placeholder": props.selected !== method.id }}
                aria-hidden="true"
              >
                {props.selected === method.id && <span class="size-3 rounded-pill bg-brand-pink" />}
              </span>
            </button>
          )}
        </For>
      </div>
      <p class="text-xs text-ink-gray">{props.selected === "cod" ? "ชำระเงินสดเมื่อได้รับสินค้า" : "กรอกรายละเอียดการชำระเงินในขั้นตอนถัดไป"}</p>
    </section>
  );
}
