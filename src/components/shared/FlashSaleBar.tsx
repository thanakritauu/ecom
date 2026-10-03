import { CountdownTimer } from "./CountdownTimer";
import flashSaleBolt from "~/assets/icons/flash-sale-bolt-bar.svg";

/**
 * Flash Sale countdown bar (Figma 546:2698) — the single Flash Sale element
 * shared by ProductCard and the PDP gallery. Meant to be overlaid on the
 * bottom edge of a product photo (`class="absolute inset-x-0 bottom-0"`),
 * so it never adds height to the card or pushes content below the image.
 * Visibility (active sale, in stock) stays the caller's decision.
 *
 * The card bar is its own size container: everything inside (bolt, label,
 * digits) scales down together on narrow cards (2-up mobile rail, 5-up at
 * 1024px) and reaches Figma's 12px/16px sizing once the bar is ≥200px wide —
 * the "สิ้นสุดภายใน" label is never hidden.
 */
export function FlashSaleBar(props: { endsAt: number; size?: "card" | "lg"; class?: string }) {
  const lg = () => props.size === "lg";
  return (
    <div class={`bg-gradient-to-r from-[#f42b59] to-[#ff9300] [container-type:inline-size] ${props.class ?? ""}`}>
      <div
        class={`flex items-center justify-between ${
          lg()
            ? "gap-2 p-3 sm:p-4"
            : "gap-1 px-1 py-1 [@container(min-width:170px)]:px-1.5 [@container(min-width:170px)]:py-1.5 [@container(min-width:200px)]:p-2"
        }`}
      >
        <span class="sr-only">Flash Sale</span>
        <span class={`flex min-w-0 items-center ${lg() ? "gap-1.5" : "gap-0.5 [@container(min-width:200px)]:gap-1"}`}>
          <img
            src={flashSaleBolt}
            alt=""
            width="11"
            height="16"
            class={`w-auto shrink-0 ${lg() ? "h-5" : "h-3 [@container(min-width:200px)]:h-4"}`}
          />
          <span
            class={`whitespace-nowrap text-white ${
              lg() ? "text-base" : "text-[9px] [@container(min-width:170px)]:text-[10px] [@container(min-width:200px)]:text-xs"
            }`}
          >
            สิ้นสุดภายใน
          </span>
        </span>
        <CountdownTimer endsAt={props.endsAt} size={lg() ? "bar-lg" : "bar"} />
      </div>
    </div>
  );
}
