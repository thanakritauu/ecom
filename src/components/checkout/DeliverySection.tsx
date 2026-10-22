import { For, Show } from "solid-js";
import { DELIVERY_OPTIONS, type DeliveryOptionId } from "~/lib/cartSelectors";
import { CheckIcon } from "../shared/icons";
import { formatTHB } from "../shared/PriceDisplay";
import dhlLogo from "~/assets/icons/dhl-logo-circle.png";
import flashLogo from "~/assets/icons/flash-express-logo.jpg";
import kexLogo from "~/assets/icons/kex-logo.jpg";
import emsLogo from "~/assets/icons/ems-logo.png";

/**
 * Checkout delivery choice — the payment-method tiles' layout (2x2 at every size: mark on top, then name
 * and fee on one row, tick top-right). DHL is the default; the picked carrier's fee goes into the order total.
 */
export function DeliverySection(props: {
  value: DeliveryOptionId;
  onChange: (id: DeliveryOptionId) => void;
  /** Free shipping unlocked: every option shows its fee struck through. */
  free?: boolean;
  disabled?: boolean;
}) {
  return (
    <section aria-labelledby="delivery-heading" class="flex w-full flex-col gap-4">
      <h2 id="delivery-heading" class="text-lg font-semibold text-ink">
        เลือกการจัดส่ง
      </h2>
      <div role="radiogroup" aria-labelledby="delivery-heading" class="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-3">
        <For each={DELIVERY_OPTIONS}>
          {(o) => (
            <button
              type="button"
              role="radio"
              aria-checked={props.value === o.id}
              disabled={props.disabled}
              onClick={() => props.onChange(o.id)}
              class="font-normal relative flex h-full flex-col items-start gap-2 rounded-card border-2 p-3 pr-9 text-left transition-colors duration-150 disabled:opacity-60 sm:p-4 sm:pr-10"
              classList={{
                "border-brand-pink bg-surface-pink": props.value === o.id,
                "border-surface-gray bg-white lg:hover:border-brand-pink/40": props.value !== o.id,
              }}
            >
              <CarrierMark id={o.id} />
              {/* Name left, fee right on one row; the row reaches under the tick column so the fee lines up with the tick. */}
              <span class="-mr-6 flex min-w-0 items-baseline justify-between gap-2 self-stretch">
                <span class="min-w-0 text-sm font-semibold leading-[1.75] text-ink sm:text-base">{o.name}</span>
                {/* The carrier's fee; with free shipping, struck through + "ส่งฟรี" (same as the summary's ค่าจัดส่ง row). */}
                <Show when={props.free} fallback={<span class="shrink-0 text-sm leading-[1.75] text-ink">{formatTHB(o.fee)}</span>}>
                  <span class="flex shrink-0 flex-col items-end text-sm leading-[1.75] sm:flex-row sm:items-baseline sm:gap-1.5">
                    <span class="text-xs text-ink-gray line-through">{formatTHB(o.fee)}</span>
                    <span class="font-semibold text-success">ส่งฟรี</span>
                  </span>
                </Show>
              </span>
              <Show when={props.value === o.id}>
                <span class="absolute right-3 top-3 flex size-5 items-center justify-center rounded-pill bg-brand-pink text-white" aria-hidden="true">
                  <CheckIcon class="size-3" />
                </span>
              </Show>
            </button>
          )}
        </For>
      </div>
    </section>
  );
}

/** Each carrier's logo in a 32px circle (same size as the payment icons). The square logos are centred, so
 * the circle only trims empty background; EMS sits on white, so it gets a hairline ring on the white tile. */
const CARRIER_LOGOS: Record<DeliveryOptionId, { src: string; ring?: boolean }> = {
  dhl: { src: dhlLogo },
  flash: { src: flashLogo },
  kerry: { src: kexLogo },
  ems: { src: emsLogo, ring: true },
};

function CarrierMark(props: { id: DeliveryOptionId }) {
  return (
    <img
      src={CARRIER_LOGOS[props.id].src}
      alt=""
      class="size-8 shrink-0 rounded-pill object-cover"
      classList={{ "ring-1 ring-border": !!CARRIER_LOGOS[props.id].ring }}
    />
  );
}
