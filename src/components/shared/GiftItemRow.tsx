import { createSignal, Show } from "solid-js";
import { clientOnly } from "@solidjs/start";
import type { GiftLine } from "~/lib/promotionEngine";
import { useCart } from "~/lib/cart";
import { formatTHB } from "./PriceDisplay";
import { GiftIcon } from "./icons";

// Kobalte Dialog SSR/hydration issue (the cart page renders on the server): the picker mounts on the client only.
const GiftVariantSheet = clientOnly(() => import("./GiftVariantSheet").then((m) => ({ default: m.GiftVariantSheet })));

/**
 * An unlocked free gift as a cart line, one per unlocked tier of every
 * active gift promo. Same image/text sizing as `CartItemRow` (drawer vs.
 * page), but no stepper / remove, since gifts follow the cart rather than
 * being `CartLine`s. A gift with options ships as the first allowed one
 * unless the customer picks another ("เปลี่ยน" opens `GiftVariantSheet`).
 */
export function GiftItemRow(props: { gift: GiftLine; variant?: "drawer" | "page" }) {
  const layout = () => props.variant ?? "drawer";
  const product = () => props.gift.product;
  const cart = useCart();
  const [pickerOpen, setPickerOpen] = createSignal(false);
  const canChoose = () => props.gift.options.length > 1;

  return (
    <li
      class="flex list-none gap-4"
      classList={{ "rounded-card border border-[#7650FF]/30 bg-[#7650FF]/5 p-4": layout() === "page" }}
    >
      <div
        class="shrink-0 overflow-hidden rounded-media border border-surface-gray"
        classList={{ "size-20": layout() === "drawer", "size-24": layout() === "page" }}
      >
        <img src={props.gift.variant?.image ?? product().image} alt={product().name} class="size-full object-cover" />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <span class="inline-flex w-fit items-center gap-1 rounded-pill bg-gradient-to-r from-[#7650FF] to-[#27CD97] px-2 py-0.5 text-xs font-semibold text-white">
          <GiftIcon class="size-3.5" /> ของแถมฟรี
        </span>
        <p class="line-clamp-2 font-medium leading-[1.75] text-ink" classList={{ "text-sm": layout() === "drawer", "text-base": layout() === "page" }}>
          {product().name}
        </p>
        <Show when={props.gift.options.length > 0}>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Show when={props.gift.variant}>{(v) => <span class="text-ink-gray">ตัวเลือก {v().label}</span>}</Show>
            <Show when={canChoose()}>
              <button type="button" onClick={() => setPickerOpen(true)} aria-haspopup="dialog" class="text-sm font-medium text-brand-pink underline">
                เปลี่ยน
              </button>
            </Show>
          </div>
        </Show>
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-3">
            <span class="text-base font-bold text-system-red">ฟรี</span>
            <span class="text-ink-gray line-through">{formatTHB(product().compareAtPrice ?? product().price)}</span>
          </div>
          <span class="text-sm text-ink-gray">x{props.gift.qty}</span>
        </div>
      </div>
      <Show when={canChoose()}>
        <GiftVariantSheet open={pickerOpen()} onOpenChange={setPickerOpen} gift={props.gift} onPick={(id) => cart.setGiftChoice(props.gift.key, id)} />
      </Show>
    </li>
  );
}
