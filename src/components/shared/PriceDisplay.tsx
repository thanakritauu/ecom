import { Show } from "solid-js";

export function formatTHB(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PriceDisplay(props: { price: number; compareAtPrice?: number; size?: "sm" | "md" }) {
  const big = props.size !== "sm";
  return (
    <div class="flex flex-wrap items-baseline gap-3">
      <span class={`font-bold text-system-red ${big ? "text-xl" : "text-base"}`}>
        {formatTHB(props.price)}
      </span>
      <Show when={props.compareAtPrice && props.compareAtPrice > props.price}>
        <span class="text-ink-gray line-through">{formatTHB(props.compareAtPrice!)}</span>
      </Show>
    </div>
  );
}
