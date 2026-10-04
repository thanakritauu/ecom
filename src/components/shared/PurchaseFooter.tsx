import { Show } from "solid-js";
import { AddToCartButton } from "./AddToCartButton";
import { formatTHB } from "./PriceDisplay";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The buy row shared by the Product Option Modal's pinned footer and the
 * PDP's sticky bar, so both read and behave the same: left = (optional
 * thumbnail) option name + price + compare-at price; right = the quantity
 * stepper right before the add-to-cart button (both 52px from `sm`).
 *
 * Below `sm` the two layouts differ:
 * - `modal` (default): price row on top, stepper + CTA under it.
 * - `bar` (PDP sticky bar): still ONE row — 32px thumbnail, price over
 *   compare-at price, a 40px stepper and the standard AddToCartButton at
 *   its compact phone size (icon + full label), so it fits a 360px phone.
 *   The option name is hidden there (it's on the page); the price never
 *   shrinks.
 */
export function PurchaseFooter(props: {
  layout?: "modal" | "bar";
  image?: string;
  optionLabel?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  onQuantityChange: (n: number) => void;
  maxQuantity?: number;
  disabled?: boolean;
  loading?: boolean;
  outOfStock?: boolean;
  /** Overrides the CTA label for a transient state only (e.g. "ลองอีกครั้ง"); default is the standard AddToCartButton label. */
  ctaLabel?: string;
  onAdd: () => void;
}) {
  const bar = () => props.layout === "bar";
  const hasCompare = () => !!props.compareAtPrice && props.compareAtPrice > props.price;

  return (
    <div
      class="flex sm:flex-row sm:items-center sm:gap-4"
      classList={{ "flex-col gap-3": !bar(), "flex-row items-center gap-1": bar() }}
    >
      <div
        class="flex min-w-0 flex-1 items-center sm:justify-start sm:gap-3"
        classList={{ "justify-center gap-3": !bar(), "gap-1.5": bar() }}
      >
        <Show when={props.image}>
          {(src) => (
            <img
              src={src()}
              alt=""
              class="shrink-0 rounded-media border border-surface-gray object-cover sm:size-[52px]"
              classList={{ "size-11": !bar(), "size-8": bar() }}
            />
          )}
        </Show>
        <div
          class="flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1"
          classList={{
            "flex-wrap items-center gap-x-4 gap-y-1": !bar(),
            "justify-center text-center sm:justify-start sm:text-left": !bar() && !props.image,
            "min-w-0": !bar(),
            "shrink-0 flex-col": bar(),
          }}
        >
          <Show when={props.optionLabel}>
            <span class="break-words text-sm font-medium leading-6 text-ink-gray" classList={{ "hidden sm:inline": bar() }}>
              {props.optionLabel}
            </span>
          </Show>
          <span
            class="flex sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2"
            classList={{
              "flex-wrap items-baseline gap-x-2": !bar(),
              "justify-center sm:justify-start": !bar() && !props.image,
              "flex-col": bar(),
            }}
          >
            <span class="font-bold leading-tight text-system-red sm:text-2xl" classList={{ "text-xl": !bar(), "text-base": bar() }}>
              {formatTHB(props.price)}
            </span>
            <Show when={hasCompare()}>
              <span
                class="text-ink-gray line-through sm:text-base sm:leading-6"
                classList={{ "text-sm leading-5": !bar(), "text-xs leading-4": bar() }}
              >
                {formatTHB(props.compareAtPrice!)}
              </span>
            </Show>
          </span>
        </div>
      </div>
      <div class="flex items-center sm:shrink-0 sm:gap-3" classList={{ "gap-3": !bar(), "shrink-0 gap-1": bar() }}>
        <QuantityStepper
          value={props.quantity}
          onChange={props.onQuantityChange}
          max={props.maxQuantity}
          disabled={props.disabled}
          compactOnMobile={bar()}
        />
        <AddToCartButton
          size={bar() ? "compact" : "md"}
          class="min-w-0 sm:w-[220px] sm:flex-none lg:w-[260px]"
          classList={{ "flex-1": !bar(), "shrink-0": bar() }}
          disabled={props.disabled}
          outOfStock={props.outOfStock}
          label={props.ctaLabel}
          loading={props.loading}
          onClick={props.onAdd}
        />
      </div>
    </div>
  );
}
