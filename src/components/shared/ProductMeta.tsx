import { Show } from "solid-js";
import starGold from "~/assets/icons/star-gold-4.svg";

/**
 * Rating + sold-count row ("★ 4.9/5 ขายแล้ว 1,850 ชิ้น"), shared by every
 * Product Card on Home. A card can be as narrow as ~150px (6-column desktop
 * grid, mobile rail), so this line must never wrap and never overflow the
 * card — no ellipsis, no hiding either number. Kept deliberately small/tight
 * (11px type, minimal gaps) so the full text fits on one line at the
 * narrowest real card width instead of needing to truncate anything.
 */
export function ProductMeta(props: { rating?: number; soldCount?: number }) {
  return (
    <Show when={props.rating}>
      <div class="flex min-w-0 items-center gap-1 whitespace-nowrap text-[11px] text-ink-gray">
        <span class="flex shrink-0 items-center gap-0.5">
          <img src={starGold} alt="" class="size-3 shrink-0" />
          {props.rating!.toFixed(1)}/5
        </span>
        <Show when={props.soldCount}>
          <span>ขายแล้ว {props.soldCount!.toLocaleString("th-TH")} ชิ้น</span>
        </Show>
      </div>
    </Show>
  );
}
