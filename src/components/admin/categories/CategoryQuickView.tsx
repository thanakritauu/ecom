import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
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
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={c().image} fallback={<ImageIcon class="size-5" />}>
            <img src={c().image} alt="" class="size-full object-cover" />
          </Show>
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{c().name}</p>
          <p class="truncate text-sm text-ink-gray">/{c().slug}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={CATEGORY_STATUS_META[c().status].tone}>{CATEGORY_STATUS_META[c().status].label}</StatusBadge>
      </div>

      <Show when={c().description}>
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">รายละเอียด</p>
          <p class="text-sm text-ink-gray">{c().description}</p>
        </div>
      </Show>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">จำนวนสินค้า</span>
          <span class="font-medium text-ink">{classifiedCount()} รายการ</span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าในหมวดหมู่นี้</p>
        <Show when={previewProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าในหมวดหมู่นี้</p>}>
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

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {c().createdAt}</span>
        <span>แก้ไขล่าสุด {c().updatedAt}</span>
      </div>
    </div>
  );
}
