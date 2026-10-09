import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { CATEGORY_STATUS_META, type AdminCategory } from "~/lib/adminCategories";
import { productsInCategory } from "~/lib/masterDataRelations";

/** Mirrors `CollectionQuickView`'s shape — name, status, description, product preview — plus the thumbnail and slug a taxonomy entry needs. */
export function CategoryQuickView(props: { category: AdminCategory }) {
  const c = () => props.category;
  const productStore = useAdminProducts();
  /** Category = Product Classification — every product that classifies *itself* under this Category via `ProductForm`, same derived relationship the List column and Detail page use. Categories no longer curate a separate "featured" list (that's Collection's job). */
  const classifiedProducts = () => productsInCategory(c().id, productStore.products());
  const previewProducts = () => classifiedProducts().slice(0, 6);
  const classifiedCount = () => classifiedProducts().length;

  return (
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-base font-semibold text-ink">{c().name}</p>
        <p class="text-sm text-ink-gray">/{c().slug}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={CATEGORY_STATUS_META[c().status].tone}>{CATEGORY_STATUS_META[c().status].label}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="จำนวนสินค้า" value={`${classifiedCount().toLocaleString("th-TH")} สินค้า`} />
        <Field label="แก้ไขล่าสุด" value={c().updatedAt || "-"} />
      </div>

      <Show when={c().description}>
        <p class="line-clamp-4 text-sm text-ink-gray">{c().description}</p>
      </Show>

      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink">สินค้าในหมวดหมู่นี้</p>
        <Show when={previewProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าในหมวดหมู่นี้</p>}>
          <div class="flex flex-col gap-2">
            <For each={previewProducts()}>
              {(product) => (
                <div class="flex items-center gap-3">
                  <img src={product!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
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
