import { createMemo, createSignal, For, Show } from "solid-js";
import { useAdminProducts } from "~/lib/adminProductStore";
import { SearchInput } from "~/components/admin/SearchInput";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { DragHandleIcon, ImageIcon, CloseXIcon, ChevronDownIcon } from "~/components/admin/icons";
import type { PromotionPageProductRef } from "~/lib/adminContent";

/**
 * §13-17 — the Products section's whole picking experience: Search → picker
 * list (checkbox/image/name/SKU/price/stock) → "สินค้าที่เลือก" list that
 * supports reorder (native HTML5 drag-and-drop, with ‹/› move buttons as the
 * same always-available fallback `ProductImageUploader` already uses for
 * reordering) and, per product, an image-only variant multi-select — reusing
 * `useAdminProducts()` (real Admin product data, never a second dataset) and
 * the existing `ProductQuickView`/`QuickViewDrawer` for "view full details",
 * never a new Quick View shape.
 */
export function PromotionPageProductPicker(props: { selected: PromotionPageProductRef[]; onChange: (next: PromotionPageProductRef[]) => void }) {
  const store = useAdminProducts();
  const [search, setSearch] = createSignal("");
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return store.products();
    return store.products().filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  });

  const selectedIds = createMemo(() => new Set(props.selected.map((r) => r.productId)));
  const allFilteredSelected = createMemo(() => filtered().length > 0 && filtered().every((p) => selectedIds().has(p.id)));

  const toggle = (productId: string) => {
    if (selectedIds().has(productId)) {
      props.onChange(props.selected.filter((r) => r.productId !== productId));
    } else {
      props.onChange([...props.selected, { productId, variantIds: [] }]);
    }
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected()) {
      const removeIds = new Set(filtered().map((p) => p.id));
      props.onChange(props.selected.filter((r) => !removeIds.has(r.productId)));
    } else {
      const existing = new Set(props.selected.map((r) => r.productId));
      const additions = filtered().filter((p) => !existing.has(p.id)).map((p) => ({ productId: p.id, variantIds: [] as string[] }));
      props.onChange([...props.selected, ...additions]);
    }
  };

  const clearSelection = () => props.onChange([]);
  const removeAt = (index: number) => props.onChange(props.selected.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= props.selected.length) return;
    const next = [...props.selected];
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= props.selected.length || to >= props.selected.length) return;
    const next = [...props.selected];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    props.onChange(next);
  };

  const toggleVariant = (productId: string, variantId: string) => {
    props.onChange(
      props.selected.map((r) => {
        if (r.productId !== productId) return r;
        const has = r.variantIds.includes(variantId);
        return { ...r, variantIds: has ? r.variantIds.filter((v) => v !== variantId) : [...r.variantIds, variantId] };
      }),
    );
  };

  return (
    <div class="flex flex-col gap-4">
      <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาสินค้า, SKU..." />
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center gap-2 text-ink-gray">
          <input type="checkbox" checked={allFilteredSelected()} onChange={toggleAllFiltered} class="size-4 rounded accent-brand-pink" />
          เลือกทั้งหมด
        </label>
        <span class="font-medium text-ink">เลือกแล้ว {props.selected.length} รายการ</span>
      </div>

      <div class="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-card border border-border p-2">
        <Show when={filtered().length > 0} fallback={<p class="p-4 text-center text-sm text-ink-gray">ไม่พบสินค้าที่ค้นหา</p>}>
          <For each={filtered()}>
            {(product) => (
              <div class="flex items-center gap-3 rounded-card p-2 transition-colors duration-150 hover:bg-surface-pink/30">
                <input
                  type="checkbox"
                  aria-label={`เลือก ${product.name}`}
                  checked={selectedIds().has(product.id)}
                  onChange={() => toggle(product.id)}
                  class="size-4 shrink-0 rounded accent-brand-pink"
                />
                <button type="button" onClick={() => setQuickViewId(product.id)} class="font-normal flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={product.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink">{product.name}</p>
                    <p class="text-xs text-ink-gray">
                      {product.sku} ราคา {formatAdminCurrency(product.price)} สต๊อก {product.stockLeft ?? 0}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-ink">สินค้าที่เลือก {props.selected.length} รายการ</p>
          <Show when={props.selected.length > 0}>
            <button type="button" onClick={clearSelection} class="text-sm text-ink-gray hover:text-ink hover:underline">
              ล้างการเลือก
            </button>
          </Show>
        </div>

        <Show when={props.selected.length > 0} fallback={<p class="rounded-card bg-surface-gray/60 p-4 text-center text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>}>
          <div class="flex flex-col gap-2">
            <For each={props.selected}>
              {(ref, index) => {
                const product = () => store.getById(ref.productId);
                return (
                  <div
                    draggable="true"
                    onDragStart={() => setDragIndex(index())}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIndex();
                      if (from !== null) reorder(from, index());
                      setDragIndex(null);
                    }}
                    class="flex flex-col gap-2 rounded-card border border-border p-3"
                  >
                    <div class="flex items-center gap-3">
                      <span class="cursor-grab text-ink-placeholder" aria-hidden="true">
                        <DragHandleIcon class="size-4" />
                      </span>
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-gray text-xs font-semibold text-ink-gray">{index() + 1}</span>
                      <Show when={product()} fallback={<div class="size-10 shrink-0 rounded-media bg-surface-gray" />}>
                        {(p) => <img src={p().image} alt="" class="size-10 shrink-0 rounded-media object-cover" />}
                      </Show>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-ink">{product()?.name ?? ref.productId}</p>
                        <Show when={product()}>
                          {(p) => (
                            <p class="text-xs text-ink-gray">
                              {p().sku} ราคา {formatAdminCurrency(p().price)} สต๊อก {p().stockLeft ?? 0}
                            </p>
                          )}
                        </Show>
                      </div>
                      <div class="flex shrink-0 items-center gap-1">
                        <Show when={index() > 0}>
                          <button type="button" onClick={() => move(index(), -1)} aria-label="ย้ายขึ้น" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                            <ChevronDownIcon class="size-4 rotate-180" />
                          </button>
                        </Show>
                        <Show when={index() < props.selected.length - 1}>
                          <button type="button" onClick={() => move(index(), 1)} aria-label="ย้ายลง" class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                            <ChevronDownIcon class="size-4" />
                          </button>
                        </Show>
                        <button type="button" onClick={() => removeAt(index())} aria-label={`นำ ${product()?.name ?? ""} ออก`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-danger-soft hover:text-danger-strong">
                          <CloseXIcon class="size-3" />
                        </button>
                      </div>
                    </div>

                    <Show when={product()?.adminVariants.length}>
                      <div class="ml-16 flex flex-wrap gap-2 border-t border-border pt-2">
                        <For each={product()!.adminVariants}>
                          {(variant) => {
                            const checked = () => ref.variantIds.includes(variant.id);
                            return (
                              <button
                                type="button"
                                aria-pressed={checked()}
                                onClick={() => toggleVariant(ref.productId, variant.id)}
                                class="flex flex-col items-center gap-1"
                              >
                                <span
                                  class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-media border-2 bg-surface-gray/60 transition-colors duration-150"
                                  classList={{ "border-brand-pink": checked(), "border-border": !checked() }}
                                >
                                  <Show when={variant.images?.[0]} fallback={<ImageIcon class="size-4 text-ink-placeholder" />}>
                                    {(src) => <img src={src()} alt="" class="size-full object-cover" />}
                                  </Show>
                                </span>
                                <span class="max-w-[3.5rem] truncate text-[10px] text-ink-gray">{variant.label}</span>
                              </button>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
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
