import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { STOCK_STATUS_META, getAvailableStock, inventoryStatusLabel, type AdminInventoryStock } from "~/lib/adminInventoryStock";
import type { AdminProduct } from "~/lib/adminProductStore";

/** Read-only — every field here is the Inventory System's own Stock data; Product name/SKU/image are looked up live, never duplicated. */
export function InventoryQuickView(props: { stock: AdminInventoryStock; product: AdminProduct | undefined }) {
  const s = () => props.stock;
  const p = () => props.product;

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={p()?.image} fallback={<ImageIcon class="size-5" />}>
            <img src={p()!.image} alt="" class="size-full object-cover" />
          </Show>
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{p()?.name ?? "(ไม่พบสินค้า)"}</p>
          <p class="truncate text-sm text-ink-gray">
            {p()?.sku ?? "-"}
            {s().variantLabel ? ` · ${s().variantLabel}` : ""}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={STOCK_STATUS_META[s().status].tone}>{inventoryStatusLabel(s())}</StatusBadge>
        <StatusBadge tone="info">Source: {s().source}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="Stock On Hand" value={s().onHand.toLocaleString("th-TH")} />
        <Field label="Reserved" value={s().reserved.toLocaleString("th-TH")} />
        <Field label="Available" value={getAvailableStock(s()).toLocaleString("th-TH")} />
        <Field label="Warehouse" value={s().warehouse} />
        <Field label="Last Sync" value={s().syncedAt} />
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="font-medium text-ink">{props.value}</p>
    </div>
  );
}
