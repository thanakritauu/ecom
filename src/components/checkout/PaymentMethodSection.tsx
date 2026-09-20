import { createSignal, For, Show } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import { TextField } from "../shared/TextField";

export type CardDetails = { number: string; expiry: string; cvv: string; name: string };

/**
 * Figma shows "บัตรเครดิต / เดบิต" pre-selected with a small
 * "1234 5678 9012 3456  CVC: 123" line under the title — read as a hint that
 * choosing this method needs real card fields (PART 11), not literal
 * pre-filled card data. The fields only appear once this option is
 * selected, matching how a real checkout progressively discloses them.
 */
export function PaymentMethodSection(props: {
  selected: PaymentMethodId;
  onSelect: (id: PaymentMethodId) => void;
  card: CardDetails;
  onCardChange: (card: CardDetails) => void;
  cardErrors?: Partial<Record<keyof CardDetails, string>>;
}) {
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
              class="flex flex-1 items-center gap-2 rounded-card border p-4 text-left transition-colors duration-150"
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

      <Show when={props.selected === "card"}>
        <CardForm card={props.card} onChange={props.onCardChange} errors={props.cardErrors} />
      </Show>
    </section>
  );
}

function CardForm(props: { card: CardDetails; onChange: (card: CardDetails) => void; errors?: Partial<Record<keyof CardDetails, string>> }) {
  const set = <K extends keyof CardDetails>(key: K, value: string) => props.onChange({ ...props.card, [key]: value });

  return (
    <div class="flex flex-col gap-4 rounded-card border border-surface-gray p-4">
      <TextField
        label="หมายเลขบัตร"
        required
        inputMode="numeric"
        placeholder="1234 5678 9012 3456"
        maxlength={19}
        value={props.card.number}
        onInput={(e) => set("number", e.currentTarget.value)}
        error={props.errors?.number}
      />
      <TextField
        label="ชื่อบนบัตร"
        required
        placeholder="CHARMISS SHOPPER"
        value={props.card.name}
        onInput={(e) => set("name", e.currentTarget.value)}
        error={props.errors?.name}
      />
      <div class="grid grid-cols-2 gap-4">
        <TextField
          label="วันหมดอายุ"
          required
          placeholder="MM/YY"
          maxlength={5}
          value={props.card.expiry}
          onInput={(e) => set("expiry", e.currentTarget.value)}
          error={props.errors?.expiry}
        />
        <TextField
          label="CVV"
          required
          inputMode="numeric"
          placeholder="123"
          maxlength={4}
          value={props.card.cvv}
          onInput={(e) => set("cvv", e.currentTarget.value)}
          error={props.errors?.cvv}
        />
      </div>
    </div>
  );
}
