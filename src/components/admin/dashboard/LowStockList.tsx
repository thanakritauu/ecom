import { createMemo, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { getLowStockProducts } from "~/lib/adminDashboard";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { getStockStatus, STOCK_STATUS_META, useAdminProducts } from "~/lib/adminProductStore";

/**
 * PART 11 — same real catalog as Best Sellers, filtered to whatever already
 * carries a low/zero `stockLeft` (adminDashboard.ts). Global UI Correction
 * #9/11: opens the same ProductQuickView drawer as Best Sellers instead of a
 * bespoke low-stock summary — it already shows stock + status, so a second
 * component would just duplicate it. "ดูรายละเอียดทั้งหมด" still lands on
 * `/admin/products/:id` since there's no per-product inventory page yet.
 */
export function LowStockList() {
  const store = useAdminProducts();
  const navigate = useNavigate();
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));
  const lowStockProducts = createMemo(() => getLowStockProducts(store.products()));

  return (
    <Show
      when={lowStockProducts().length > 0}
      fallback={<p class="text-sm text-ink-gray">ไม่มีสินค้าใกล้หมดในตอนนี้</p>}
    >
      <ul class="flex flex-col gap-1">
        <For each={lowStockProducts()}>
          {(entry) => (
            <li>
              <button
                type="button"
                onClick={() => setQuickViewId(entry.product.id)}
                class="font-normal flex w-full items-center gap-3 rounded-card px-2 py-2.5 text-left transition-colors duration-150 lg:hover:bg-surface-pink/40"
              >
                <img src={entry.product.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{entry.product.name}</p>
                  <p class="text-xs text-ink-gray">{entry.sku}</p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1">
                  <p class="text-sm font-semibold text-ink">เหลือ {entry.stockLeft.toLocaleString("th-TH")} ชิ้น</p>
                  <StatusBadge tone={STOCK_STATUS_META[getStockStatus(entry.product)].tone}>{STOCK_STATUS_META[getStockStatus(entry.product)].label}</StatusBadge>
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
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/products/${id}`);
        }}
      >
        <Show when={quickViewProduct()}>{(p) => <ProductQuickView product={p()} />}</Show>
      </QuickViewDrawer>
    </Show>
  );
}
