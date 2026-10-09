import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { getStockStatus, STOCK_STATUS_META, stockStatusLabel, ADMIN_PRODUCT_STATUS_META, type AdminProduct } from "~/lib/adminProductStore";

/** Stock at a glance for one product: what the storefront reads (product stock + each option's stock). */
export function InventoryQuickView(props: { product: AdminProduct }) {
  const p = () => props.product;
  const image = () => p().mainImage ?? p().images?.[0] ?? p().image;

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={image()}
        fallback={
          <div class="flex aspect-square w-full items-center justify-center rounded-media bg-surface-gray/60">
            <ImageIcon class="size-8 text-ink-placeholder" />
          </div>
        }
      >
        {(src) => <img src={src()} alt="" class="aspect-square w-full rounded-media object-cover" />}
      </Show>

      <div>
        <p class="text-base font-semibold text-ink">{p().name}</p>
        <p class="mt-1 text-xl font-bold text-ink">{(p().stockLeft ?? 0).toLocaleString("th-TH")} ชิ้น</p>
        <p class="text-sm text-ink-gray">{p().sku}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={STOCK_STATUS_META[getStockStatus(p())].tone}>{stockStatusLabel(p())}</StatusBadge>
        <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[p().status].tone}>{ADMIN_PRODUCT_STATUS_META[p().status].label}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="ใกล้หมดเมื่อเหลือ" value={`${p().lowStockThreshold} ชิ้น`} />
        <Field label="ขายแล้ว" value={`${(p().soldCount ?? 0).toLocaleString("th-TH")} ชิ้น`} />
        <Field label="ตัวเลือก" value={p().adminVariants.length > 0 ? `${p().adminVariants.length} ตัวเลือก` : "-"} />
        <Field label="แก้ไขล่าสุด" value={p().updatedAt || "-"} />
      </div>

      <Show when={p().adminVariants.length > 0}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">สต๊อกตามตัวเลือก</p>
          <dl class="flex flex-col gap-1.5 text-sm">
            <For each={p().adminVariants}>
              {(v) => (
                <div class="flex items-center justify-between gap-3">
                  <dt class="truncate text-ink-gray">{v.label || "ตัวเลือก"}</dt>
                  <dd class="flex items-center gap-2 font-medium text-ink">
                    {v.stock.toLocaleString("th-TH")}
                    <Show when={v.soldOut || v.stock <= 0}>
                      <StatusBadge tone="danger">สินค้าหมด</StatusBadge>
                    </Show>
                  </dd>
                </div>
              )}
            </For>
          </dl>
        </div>
      </Show>
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
