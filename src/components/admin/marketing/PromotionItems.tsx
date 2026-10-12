import { For, Show, type JSX } from "solid-js";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import type { ProductSkuRef } from "~/lib/productSkuRef";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatBaht, promotionItemsTotal, type Promotion, type PromotionItem } from "~/lib/adminMarketing";

/** A product line as typed into the form (qty stays a string until saved; `variantIds` empty = any option). */
export type PromotionItemDraft = { productId: string; qty: string; variantIds: string[] };

export const toItemDrafts = (items: PromotionItem[] | undefined): PromotionItemDraft[] =>
  (items ?? []).map((i) => ({ productId: i.productId, qty: String(i.qty), variantIds: i.variantIds ?? [] }));
export const fromItemDrafts = (items: PromotionItemDraft[]): PromotionItem[] =>
  items.map((i) => ({ productId: i.productId, qty: Math.max(1, Math.floor(Number(i.qty)) || 1), ...(i.variantIds.length > 0 ? { variantIds: i.variantIds } : {}) }));
export const itemDraftsValid = (items: PromotionItemDraft[]) => items.every((i) => Number.isInteger(Number(i.qty)) && Number(i.qty) >= 1);

/**
 * Editable product box (bundle items, either side of a buy X get Y): the
 * shared `ProductSkuPicker` (whole product or specific SKUs) with a quantity
 * field on each picked product.
 */
export function PromotionItemsBox(props: {
  title: string;
  hint?: string;
  items: PromotionItemDraft[];
  onChange: (items: PromotionItemDraft[]) => void;
  error?: string;
  disabled?: boolean;
  /** Pink frame: the free side of a buy X get Y. */
  accent?: boolean;
}) {
  const productStore = useAdminProducts();
  const pick = (refs: ProductSkuRef[]) => {
    const kept = new Map(props.items.map((i) => [i.productId, i] as const));
    props.onChange(refs.map((r) => ({ productId: r.productId, variantIds: r.variantIds, qty: kept.get(r.productId)?.qty ?? "1" })));
  };
  const setQty = (productId: string, qty: string) => props.onChange(props.items.map((i) => (i.productId === productId ? { ...i, qty } : i)));

  return (
    <div class={`flex min-w-0 flex-col gap-3 rounded-card border p-3 sm:p-4 ${props.accent ? "border-brand-pink/40 bg-surface-pink/30" : "border-border"}`}>
      <p class="text-sm font-semibold text-ink">
        {props.title} <span class="text-system-red">*</span>
      </p>
      <Show when={props.hint}>
        <p class="-mt-2 text-xs text-ink-gray">{props.hint}</p>
      </Show>
      <ProductSkuPicker
        value={props.items.map((i) => ({ productId: i.productId, variantIds: i.variantIds }))}
        onChange={pick}
        disabled={props.disabled}
        error={props.error}
        columns={[
          {
            key: "qty",
            label: "จำนวน",
            required: true,
            minWidth: 110,
            product: (productId) => (
              <label class="flex items-center gap-1.5 text-xs text-ink-gray">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value={props.items.find((i) => i.productId === productId)?.qty ?? "1"}
                  disabled={props.disabled}
                  aria-label={`จำนวน ${productStore.getById(productId)?.name ?? ""}`}
                  onInput={(e) => setQty(productId, e.currentTarget.value)}
                  class="h-10 w-16 rounded-card border border-border bg-surface-card px-2 text-center text-sm text-ink outline-none focus:border-brand-pink"
                />
                ชิ้น
              </label>
            ),
          },
        ]}
      />
    </div>
  );
}

/** Read-only product lines: thumbnail, name, quantity. */
export function PromotionItemsList(props: { items: PromotionItem[]; empty?: string }) {
  const productStore = useAdminProducts();
  return (
    <Show when={props.items.length > 0} fallback={<p class="text-sm text-ink-gray">{props.empty ?? "ยังไม่ได้เลือกสินค้า"}</p>}>
      <ul class="flex flex-col gap-3">
        <For each={props.items}>
          {(item) => {
            const product = () => productStore.getById(item.productId);
            return (
              <li class="flex items-center gap-3">
                <Show when={product()} fallback={<span class="size-11 shrink-0 rounded-media bg-surface-gray" />}>
                  {(p) => <img src={p().image} alt="" class="size-11 shrink-0 rounded-media object-cover" />}
                </Show>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm leading-[1.75] text-ink">{product()?.name ?? "ไม่พบสินค้านี้ในระบบ"}</p>
                  <Show when={item.variantIds?.length}>
                    <p class="text-xs text-ink-gray">
                      เฉพาะ SKU: {item.variantIds!.map((id) => product()?.adminVariants.find((v) => v.id === id)?.label ?? id).join(", ")}
                    </p>
                  </Show>
                </div>
                <span class="shrink-0 text-sm font-medium text-ink">{item.qty} ชิ้น</span>
              </li>
            );
          }}
        </For>
      </ul>
    </Show>
  );
}

/** Buy X get Y at a glance: what to buy on the left, what's free on the right (stacked on phones). */
export function PromotionBuyGetView(props: { buyItems: PromotionItem[]; getItems: PromotionItem[] }) {
  return (
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SideBox title="สินค้าที่ต้องซื้อ">
        <PromotionItemsList items={props.buyItems} />
      </SideBox>
      <SideBox title="สินค้าที่แถม" accent>
        <PromotionItemsList items={props.getItems} />
      </SideBox>
    </div>
  );
}

/** Bundle contents with the normal total vs the set price. */
export function PromotionBundleView(props: { promotion: Pick<Promotion, "bundleItems" | "bundlePrice"> }) {
  const productStore = useAdminProducts();
  const items = () => props.promotion.bundleItems ?? [];
  const normal = () => promotionItemsTotal(items(), (id) => productStore.getById(id)?.price);
  return (
    <div class="flex flex-col gap-3">
      <PromotionItemsList items={items()} />
      <BundlePriceSummary normal={normal()} price={props.promotion.bundlePrice ?? 0} />
    </div>
  );
}

/** "ราคาปกติ / ราคาเซ็ต / ประหยัด" box, shared by the bundle form and its read-only views. */
export function BundlePriceSummary(props: { normal: number; price: number }) {
  const saving = () => props.normal - props.price;
  return (
    <dl class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <dt class="text-ink-gray">ราคาปกติรวม</dt>
        <dd class="text-ink-gray line-through">{formatBaht(props.normal)}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-ink-gray">ราคาเซ็ต</dt>
        <dd class="text-base font-bold text-brand-pink">{formatBaht(props.price)}</dd>
      </div>
      <Show when={props.normal > 0 && props.price > 0}>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-gray">ลูกค้าประหยัด</dt>
          <dd class={`font-medium ${saving() > 0 ? "text-success" : "text-system-red"}`}>
            {saving() > 0 ? `${formatBaht(saving())} (${Math.round((saving() / props.normal) * 100)}%)` : "ราคาเซ็ตไม่ต่ำกว่าราคาปกติ"}
          </dd>
        </div>
      </Show>
    </dl>
  );
}

function SideBox(props: { title: string; accent?: boolean; children: JSX.Element }) {
  return (
    <div class={`flex min-w-0 flex-col gap-3 rounded-card border p-3 ${props.accent ? "border-brand-pink/40 bg-surface-pink/30" : "border-border"}`}>
      <p class="text-sm font-semibold text-ink">{props.title}</p>
      {props.children}
    </div>
  );
}
