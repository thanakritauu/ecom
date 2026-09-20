import { For } from "solid-js";
import { A } from "@solidjs/router";
import type { Order } from "~/lib/types";
import { ORDER_STATUS_META } from "~/lib/accountData";
import { formatTHB } from "../shared/PriceDisplay";

/**
 * "ดูรายละเอียด" / "สั่งซ้ำ" both route to a real Order Detail path — Figma
 * only shows the buttons on this list, never the detail screen itself, so
 * per PART 15 this lands on OutOfScopePage (via the existing catch-all)
 * rather than inventing a detail layout or wiring a fake "reorder" against
 * historical line items that don't map to any real catalog product.
 */
export function OrderCard(props: { order: Order }) {
  const meta = () => ORDER_STATUS_META[props.order.status];
  const itemCount = () => props.order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div class="flex w-full flex-col gap-3 rounded-2xl border border-surface-gray p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-base font-semibold text-ink">#{props.order.id}</p>
            <span class={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${meta().badgeClass}`}>{meta().label}</span>
          </div>
          <p class="text-sm text-ink-gray">
            {props.order.date} · {itemCount()} ชิ้น
          </p>
        </div>

        <div class="flex flex-col items-end gap-2">
          <p class="text-xl font-bold text-ink">{formatTHB(props.order.total)}</p>
          <div class="flex items-center gap-2">
            <A
              href={`/account/orders/${props.order.id}`}
              class="flex min-h-[44px] items-center justify-center rounded-pill border border-surface-gray px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-brand-pink"
            >
              ดูรายละเอียด
            </A>
            {props.order.status === "cancelled" ? (
              <span class="flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-pill bg-surface-gray px-4 text-sm font-semibold text-ink-gray">
                สินค้าเลิกจำหน่าย
              </span>
            ) : (
              <A
                href={`/account/orders/${props.order.id}`}
                class="flex min-h-[44px] items-center justify-center rounded-pill bg-brand-pink px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-pink/90"
              >
                สั่งซ้ำ
              </A>
            )}
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <For each={props.order.items}>
          {(item) => (
            <div class="flex items-center gap-2">
              <img src={item.image} alt={item.name} loading="lazy" class="size-[66px] shrink-0 rounded-2xl border border-surface-gray object-cover" />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-sm font-medium text-ink">{item.name}</p>
                <p class="text-xs text-ink-gray">
                  เฉดสี {item.variantLabel} · x{item.qty}
                </p>
              </div>
              <p class="shrink-0 text-base font-semibold text-ink">{formatTHB(item.price)}</p>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
