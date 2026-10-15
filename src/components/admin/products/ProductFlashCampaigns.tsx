import { createMemo, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import type { AdminProduct } from "~/lib/adminProductStore";
import { MARKETING_PHASE_META } from "~/lib/adminMarketing";
import { flashPriceLabel } from "~/lib/flashSalePricing";
import { flashCampaignPhase, formatFlashSchedule } from "~/lib/flashSaleCampaigns";

/**
 * Read-only: the flash sale campaigns this product is in (name, state, time,
 * its flash price there), each linking to the campaign's form. Prices and
 * limits are edited only in the campaign.
 */
export function ProductFlashCampaigns(props: { product: AdminProduct }) {
  const marketing = useAdminMarketing();
  const rows = createMemo(() =>
    marketing.flashSales
      .items()
      .map((c) => ({ c, item: c.items.find((i) => i.productId === props.product.id) }))
      .filter((r) => !!r.item),
  );
  return (
    <Show when={rows().length > 0} fallback={<p class="text-sm text-ink">ไม่ได้อยู่ในแฟลชเซล</p>}>
      <ul class="flex flex-col gap-2">
        <For each={rows()}>
          {(r) => (
            <li class="flex flex-col gap-1 rounded-card border border-border px-3 py-2.5">
              <div class="flex flex-wrap items-center gap-2">
                <A href={`/admin/marketing/flash-sale/${r.c.id}/edit`} class="text-sm font-medium text-brand-pink underline decoration-from-font">
                  {r.c.name || "แฟลชเซล"}
                </A>
                <StatusBadge tone={MARKETING_PHASE_META[flashCampaignPhase(r.c)].tone}>{MARKETING_PHASE_META[flashCampaignPhase(r.c)].label}</StatusBadge>
              </div>
              <p class="text-xs text-ink-gray">{formatFlashSchedule(r.c)}</p>
              <p class="text-xs text-ink">ราคาแฟลชเซล {flashPriceLabel(props.product, r.item!.flash)}</p>
            </li>
          )}
        </For>
      </ul>
    </Show>
  );
}
