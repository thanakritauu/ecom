import { createMemo, createSignal, For, Show } from "solid-js";
import { useAdminProducts } from "~/lib/adminProductStore";
import { SearchInput } from "~/components/admin/SearchInput";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { formatAdminCurrency } from "~/lib/adminDashboard";

/**
 * Phase 07 #13/14/24 — one Product Selector shared by Promotion/Flash Sale/
 * Bundle forms (search, select, Select All, selected count) instead of a
 * bespoke picker per entity. Reads `useAdminProducts()` — the existing admin
 * product store, not a new dataset — so Name/Price/Stock/Sold/Variant Images
 * are the same real data Product Management itself uses. Clicking a row
 * opens the *existing* `ProductQuickView` (never a new Quick View pattern);
 * "ดูรายละเอียดทั้งหมด" opens the full Product page in a new tab rather than
 * navigating this tab away, since that would otherwise abandon whatever
 * Promotion/Flash Sale/Bundle form is still open around this selector.
 */
export function ProductSelector(props: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const store = useAdminProducts();
  const [search, setSearch] = createSignal("");
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return store.products();
    return store.products().filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  });

  const selectedSet = createMemo(() => new Set(props.selectedIds));
  const allFilteredSelected = createMemo(() => filtered().length > 0 && filtered().every((p) => selectedSet().has(p.id)));

  const toggle = (id: string) => {
    const set = new Set(props.selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    props.onChange([...set]);
  };

  const toggleAll = () => {
    const set = new Set(props.selectedIds);
    if (allFilteredSelected()) filtered().forEach((p) => set.delete(p.id));
    else filtered().forEach((p) => set.add(p.id));
    props.onChange([...set]);
  };

  return (
    <div class="flex flex-col gap-3">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาสินค้า, SKU..." />
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center gap-2 text-ink-gray">
          <input type="checkbox" checked={allFilteredSelected()} onChange={toggleAll} class="size-4 rounded accent-brand-pink" />
          เลือกทั้งหมด
        </label>
        <span class="font-medium text-ink">เลือกแล้ว {props.selectedIds.length} รายการ</span>
      </div>
      <div class="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-card border border-surface-gray p-2">
        <Show when={filtered().length > 0} fallback={<p class="p-4 text-center text-sm text-ink-gray">ไม่พบสินค้า</p>}>
          <For each={filtered()}>
            {(product) => (
              <div class="flex items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/30">
                <input
                  type="checkbox"
                  aria-label={`เลือก ${product.name}`}
                  checked={selectedSet().has(product.id)}
                  onChange={() => toggle(product.id)}
                  class="size-4 shrink-0 rounded accent-brand-pink"
                />
                <button type="button" onClick={() => setQuickViewId(product.id)} class="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={product.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink">{product.name}</p>
                    <p class="text-xs text-ink-gray">
                      {product.sku} · {formatAdminCurrency(product.price)}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>

      <QuickViewDrawer
        open={quickViewProduct() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewProduct()?.name ?? ""}
        subtitle={quickViewProduct()?.sku}
        onViewFull={() => {
          const id = quickViewId();
          if (id) window.open(`/admin/products/${id}`, "_blank", "noopener");
        }}
      >
        <Show when={quickViewProduct()}>{(p) => <ProductQuickView product={p()} />}</Show>
      </QuickViewDrawer>
    </div>
  );
}
