import { For } from "solid-js";
import type { GiftLine } from "~/lib/promotionEngine";
import { resolveVariantOptions } from "~/lib/productVariants";
import { SheetModal } from "./SheetModal";
import { OptionTile } from "./QuickAddSheet";

/**
 * Pick which option (shade) a free gift ships as. Same frame and option
 * tiles as the Product Option Modal (`QuickAddSheet`: SheetModal + OptionTile,
 * "ตัวเลือก:" line above a 3-per-row grid); tapping an option picks it and
 * closes. Only the options Admin allows and that are in stock are listed.
 */
export function GiftVariantSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; gift: GiftLine; onPick: (variantId: string) => void }) {
  const options = () => {
    const allowed = new Set(props.gift.options.map((v) => v.id));
    return resolveVariantOptions(props.gift.product).filter((o) => allowed.has(o.id));
  };
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
      <div class="flex flex-col gap-3">
        <p class="flex min-h-[24px] flex-wrap items-center gap-x-2 text-sm font-medium">
          <span class="text-black">ตัวเลือก:</span>
          <span class="text-ink-gray">{props.gift.variant?.label ?? "-"}</span>
        </p>
        <div role="radiogroup" aria-label="ตัวเลือกของแถม" class="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
          <For each={options()}>
            {(option) => (
              <OptionTile
                option={option}
                selected={props.gift.variant?.id === option.id}
                onSelect={() => {
                  props.onPick(option.id);
                  props.onOpenChange(false);
                }}
              />
            )}
          </For>
        </div>
      </div>
    </SheetModal>
  );
}
