import { Show } from "solid-js";

export function formatTHB(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * `card` is the Product Card's price row (Figma 545:6591 — 20px bold red,
 * 28px line) with a smaller struck-through original price beside it, kept
 * tight so both fit on one line at the narrowest card widths.
 */
export function PriceDisplay(props: { price: number; compareAtPrice?: number; size?: "sm" | "md" | "card" }) {
  const size = () => props.size ?? "md";
  return (
    <div class={`flex flex-wrap items-baseline ${size() === "card" ? "gap-x-1.5" : "gap-3"}`}>
      <span
        class={`font-bold text-system-red ${size() === "sm" ? "text-base" : "text-xl"}`}
        classList={{ "leading-7": size() === "card" }}
      >
        {formatTHB(props.price)}
      </span>
      <Show when={props.compareAtPrice && props.compareAtPrice > props.price}>
        <span class="text-ink-gray line-through" classList={{ "text-xs sm:text-sm": size() === "card" }}>
          {formatTHB(props.compareAtPrice!)}
        </span>
      </Show>
    </div>
  );
}
