import { createEffect, createSignal, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getStockStatus, STOCK_STATUS_META, stockStatusLabel, ADMIN_PRODUCT_STATUS_META, type AdminProduct } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { ProductVariantImages } from "./ProductVariantImages";
import { ImageIcon } from "~/components/admin/icons";

/** Fallback only for products saved before `categoryId` existed (see `normalizeAdminProduct`) — every product edited through the current `ProductForm` has a real `categoryId` instead. */
const LEGACY_CATEGORY_LABELS: Record<string, string> = { eye: "ตา", cheek: "แก้ม", lip: "ปาก" };

/**
 * PART 11 — only what's needed for a fast glance: not a second Product Detail
 * page crammed into a drawer. Global UI Correction — Final Overrides #2/#9:
 * variants render as images (not color swatches), and Price sits directly
 * under the product name — never above it. Selecting a variant swaps the
 * preview photo and, when that variant defines its own price/stock, the
 * Price/Stock fields below update to match it too.
 */
export function ProductQuickView(props: { product: AdminProduct }) {
  const p = () => props.product;
  const stockStatus = () => getStockStatus(p());
  const categoryStore = useAdminCategories();
  const brandStore = useAdminBrands();
  const categoryLabel = () => categoryStore.getById(p().categoryId)?.name ?? LEGACY_CATEGORY_LABELS[p().category ?? ""] ?? "-";
  const brandLabel = () => brandStore.getById(p().brandId)?.name ?? p().brand ?? "-";

  const [selectedVariantId, setSelectedVariantId] = createSignal<string | undefined>(undefined);

  // Resets selection whenever the underlying product itself changes — this
  // component instance is reused across different products by the Quick
  // View Drawer's `<Show>` (it only mounts/unmounts on open/close, not per
  // product), so local state must react to `p()` changing, not assume a
  // fresh mount.
  createEffect(() => {
    const variants = p().adminVariants;
    setSelectedVariantId(variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id);
  });

  const selectedVariant = () => p().adminVariants.find((v) => v.id === selectedVariantId());
  // Final UI & Regression Overrides #3: this overrides the previous
  // "swap to the selected variant's photo" behavior — the main image is
  // always the Product Gallery's photo (regardless of which variant is
  // selected), never a variant's. CMS + Frontend Final Refinement §8: an
  // explicit `mainImage` pin wins first, then `images[0]`, then `.image` —
  // same fallback chain as the Live Preview and the real `ProductCard`.
  const displayImage = () => p().mainImage ?? p().images?.[0] ?? p().image;
  const displayPrice = () => selectedVariant()?.price ?? p().price;
  const displayStock = () => selectedVariant()?.stock ?? p().stockLeft ?? 0;

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={displayImage()}
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
        <p class="mt-1 text-xl font-bold text-ink">{formatAdminCurrency(displayPrice())}</p>
        <p class="text-sm text-ink-gray">{p().sku}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[p().status].tone}>{ADMIN_PRODUCT_STATUS_META[p().status].label}</StatusBadge>
        <StatusBadge tone={STOCK_STATUS_META[stockStatus()].tone}>{stockStatusLabel(p())}</StatusBadge>
      </div>

      <Show when={p().adminVariants.length > 0}>
        <ProductVariantImages variants={p().adminVariants} selectedId={selectedVariantId()} onSelect={setSelectedVariantId} />
      </Show>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="สต๊อก" value={String(displayStock())} />
        <Field label="ขายแล้ว" value={String(p().soldCount ?? 0)} />
        <Field label="หมวดหมู่" value={categoryLabel()} />
        <Field label="แบรนด์" value={brandLabel()} />
      </div>

      <Show when={p().description}>
        <p class="line-clamp-4 text-sm text-ink-gray">{p().description}</p>
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
