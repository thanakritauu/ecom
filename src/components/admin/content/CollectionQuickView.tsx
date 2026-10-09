import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { COLLECTION_STATUS_META, type ProductCollection } from "~/lib/adminCollections";

/** Mirrors `PromotionPageQuickView`'s general shape but simpler — just name, status and a product preview list. */
export function CollectionQuickView(props: { collection: ProductCollection }) {
  const c = () => props.collection;
  const productStore = useAdminProducts();
  const previewProducts = () =>
    c()
      .products.slice(0, 6)
      .map((ref) => productStore.getById(ref.productId))
      .filter((x) => x !== undefined);

  return (
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-base font-semibold text-ink">{c().name}</p>
        <p class="text-sm text-ink-gray">{c().id}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={COLLECTION_STATUS_META[c().status].tone}>{COLLECTION_STATUS_META[c().status].label}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="จำนวนสินค้า" value={`${c().products.length.toLocaleString("th-TH")} สินค้า`} />
        <Field label="แก้ไขล่าสุด" value={c().updatedAt || "-"} />
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs text-ink-placeholder">ตัวอย่างสินค้า</p>
        <Show when={previewProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>}>
          <div class="flex flex-col gap-2">
            <For each={previewProducts()}>
              {(product) => (
                <div class="flex items-center gap-3">
                  <img src={product!.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-ink">{product!.name}</p>
                    <p class="text-xs text-ink-gray">{formatAdminCurrency(product!.price)}</p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
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
