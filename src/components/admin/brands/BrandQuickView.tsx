import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { BRAND_STATUS_META, type AdminBrand } from "~/lib/adminBrands";
import { productsInBrand } from "~/lib/masterDataRelations";

/** Mirrors `CategoryQuickView`'s shape — name, status, description, product preview — plus the logo and slug a brand entry needs. */
export function BrandQuickView(props: { brand: AdminBrand }) {
  const b = () => props.brand;
  const productStore = useAdminProducts();
  /** Brand = Product Classification — every product that classifies *itself* under this Brand via `ProductForm`, same derived relationship the List column and Detail page use. Brands no longer curate a separate "featured" list (that's Collection's job). */
  const classifiedProducts = () => productsInBrand(b().id, productStore.products());
  const previewProducts = () => classifiedProducts().slice(0, 6);
  const classifiedCount = () => classifiedProducts().length;

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={b().logo} fallback={<ImageIcon class="size-5" />}>
            <img src={b().logo} alt="" class="size-full object-cover" />
          </Show>
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-ink">{b().name}</p>
          <p class="truncate text-sm text-ink-gray">/{b().slug}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={BRAND_STATUS_META[b().status].tone}>{BRAND_STATUS_META[b().status].label}</StatusBadge>
      </div>

      <Show when={b().description}>
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">รายละเอียด</p>
          <p class="text-sm text-ink-gray">{b().description}</p>
        </div>
      </Show>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">จำนวนสินค้า</span>
          <span class="font-medium text-ink">{classifiedCount()} รายการ</span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าของแบรนด์นี้</p>
        <Show when={previewProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีสินค้าของแบรนด์นี้</p>}>
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
        <span>สร้างเมื่อ {b().createdAt}</span>
        <span>แก้ไขล่าสุด {b().updatedAt}</span>
      </div>
    </div>
  );
}
