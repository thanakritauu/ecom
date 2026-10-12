import { For, Show } from "solid-js";
import type { GiftLine } from "~/lib/promotionEngine";
import { SheetModal } from "./SheetModal";
import { CheckIcon } from "./icons";

/**
 * Pick which option (shade) a free gift ships as. Same modal frame as every
 * other storefront sheet (`SheetModal`); tapping an option picks it and closes.
 * Only the options Admin allows and that are in stock are listed.
 */
export function GiftVariantSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; gift: GiftLine; onPick: (variantId: string) => void }) {
  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      // Also opened from the cart drawer: one layer above it.
      nested
      height="auto"
      title="เลือกตัวเลือกของแถม"
      description={props.gift.product.name}
    >
      <ul class="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <For each={props.gift.options}>
          {(v) => {
            const selected = () => props.gift.variant?.id === v.id;
            return (
              <li>
                <button
                  type="button"
                  aria-pressed={selected()}
                  onClick={() => {
                    props.onPick(v.id);
                    props.onOpenChange(false);
                  }}
                  class="font-normal relative flex h-full w-full flex-col gap-1.5 rounded-card border-2 p-1.5 text-left transition-colors duration-150"
                  classList={{ "border-brand-pink bg-surface-pink": selected(), "border-surface-gray bg-white lg:hover:border-brand-pink/40": !selected() }}
                >
                  <img src={v.image ?? props.gift.product.image} alt="" class="aspect-square w-full rounded-media object-cover" />
                  <span class="flex items-center gap-1.5 px-0.5 pb-0.5 text-sm leading-[1.75] text-ink">
                    <span class="size-3.5 shrink-0 rounded-full border border-border" style={{ "background-color": v.color }} aria-hidden="true" />
                    <span class="line-clamp-2">{v.label}</span>
                  </span>
                  <Show when={selected()}>
                    <span class="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-pill bg-brand-pink text-white" aria-hidden="true">
                      <CheckIcon class="size-3" />
                    </span>
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </SheetModal>
  );
}
