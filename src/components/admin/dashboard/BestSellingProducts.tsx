import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { getBestSellingProducts, formatAdminCurrency } from "~/lib/adminDashboard";
import { EmptyState } from "~/components/admin/EmptyState";
import { CatalogIcon } from "~/components/admin/icons";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { useAdminProducts } from "~/lib/adminProductStore";

/**
 * PART 10 — top 5 by `soldCount` off the real catalog (adminDashboard.ts),
 * not invented products. Global UI Correction #9/11: a row click opens the
 * same Quick View Drawer pattern the Products/Orders lists use (reusing
 * ProductQuickView, not a dashboard-specific copy) instead of jumping
 * straight to the Products list.
 */
export function BestSellingProducts() {
  const store = useAdminProducts();
  const navigate = useNavigate();
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));
  const bestSellingProducts = createMemo(() => getBestSellingProducts(store.products()));

  return (
    <Show
      when={bestSellingProducts().length > 0}
      fallback={<EmptyState icon={<CatalogIcon />} title="ยังไม่มีข้อมูลสินค้าขายดี" />}
    >
      <ul class="flex flex-col gap-1">
        <For each={bestSellingProducts()}>
          {(entry) => (
            <li>
              <button
                type="button"
                onClick={() => setQuickViewId(entry.product.id)}
                class="font-normal flex w-full items-center gap-3 rounded-card px-2 py-2.5 text-left transition-colors duration-150 hover:bg-surface-pink/40"
              >
                <img src={entry.product.image} alt="" class="size-12 shrink-0 rounded-media object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{entry.product.name}</p>
                  <p class="truncate text-xs text-ink-gray">{entry.sku}</p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm font-semibold text-ink">{entry.sold.toLocaleString("th-TH")} sold</p>
                  <p class="text-xs text-ink-gray">{formatAdminCurrency(entry.revenue)}</p>
                </div>
              </button>
            </li>
          )}
        </For>
      </ul>

      <QuickViewDrawer
        open={quickViewProduct() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewProduct()?.name ?? ""}
        subtitle={quickViewProduct()?.sku}
        onViewFull={() => navigate(`/admin/products/${quickViewId()}`)}
      >
        <Show when={quickViewProduct()}>{(p) => <ProductQuickView product={p()} />}</Show>
      </QuickViewDrawer>
    </Show>
  );
}
