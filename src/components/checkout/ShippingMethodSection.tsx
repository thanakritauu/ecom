import { For } from "solid-js";
import { SHIPPING_METHODS, type ShippingMethodId } from "~/lib/cartSelectors";
import { formatTHB } from "../shared/PriceDisplay";

export function ShippingMethodSection(props: { selected: ShippingMethodId; onSelect: (id: ShippingMethodId) => void }) {
  return (
    <section aria-labelledby="shipping-method-heading" class="flex w-full flex-col gap-3">
      <h2 id="shipping-method-heading" class="text-lg font-semibold text-ink">
        ตัวเลือกการจัดส่ง
      </h2>
      <div role="radiogroup" aria-labelledby="shipping-method-heading" class="flex flex-col gap-4 sm:flex-row">
        <For each={SHIPPING_METHODS}>
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
              <span class="flex flex-1 flex-col">
                <span class="font-semibold text-ink">
                  {method.label} {method.fee === 0 ? "ฟรี" : formatTHB(method.fee)}
                </span>
                <span class="text-xs text-ink-gray">{method.etaLabel}</span>
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
    </section>
  );
}
