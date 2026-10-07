import { For } from "solid-js";
import {
  SKIN_TYPE_LABELS,
  getPriceBounds,
  categoryCount,
  type ProductFilters,
  type CategoryFacet,
  type CategoryFacetKey,
} from "~/lib/productListing";
import type { Product } from "~/lib/types";
import { Button } from "../shared/Button";
import { CheckIcon } from "../shared/icons";

/**
 * Shared Filter UI — the exact same component renders inline in the desktop
 * sidebar and inside the mobile drawer (see MobileFilterDrawer.tsx), per
 * PART 23/24's "one Filter System, not two".
 *
 * "ประเภทการใช้งาน" (category) is an Instant Filter per direct request —
 * `onToggleCategory` applies immediately, no Apply step. Price range stays
 * on the explicit "ใช้ตัวกรอง" / "ล้างตัวกรอง" Apply flow Figma shows for it.
 * No search box here — searching is the header's autocomplete search
 * (`/products?search=`), shown above the grid as a removable chip.
 */
export function FilterPanel(props: {
  products: Product[];
  draft: ProductFilters;
  facets: CategoryFacet[];
  onChange: (next: ProductFilters) => void;
  onToggleCategory: (key: CategoryFacetKey) => void;
  onApply: () => void;
  onReset: () => void;
  applyLabel?: string;
}) {
  const bounds = () => getPriceBounds(props.products);
  return (
    <div class="flex w-full flex-col gap-4 rounded-2xl bg-surface-pink p-4">
      <div class="flex flex-col gap-2">
        <p class="text-base font-semibold text-ink">ประเภทการใช้งาน</p>
        <div class="flex flex-col gap-1">
          <For each={props.facets}>
            {(facet) => {
              const count = () => categoryCount(facet.key, props.products, props.facets);
              const disabled = () => count() === 0;
              const checked = () => props.draft.categories.includes(facet.key);
              return (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked()}
                  disabled={disabled()}
                  onClick={() => props.onToggleCategory(facet.key)}
                  class="flex min-h-[36px] w-full items-center gap-2 rounded-lg py-0.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    class="flex size-5 shrink-0 items-center justify-center rounded-md border"
                    classList={{ "border-brand-pink bg-brand-pink": checked(), "border-ink-placeholder bg-white": !checked() }}
                    aria-hidden="true"
                  >
                    {checked() && <CheckIcon class="size-3.5 text-white" />}
                  </span>
                  <span class="flex-1 text-sm text-ink">{facet.label}</span>
                  <span class="text-sm text-ink-gray">{count()}</span>
                </button>
              );
            }}
          </For>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-base font-semibold text-ink">เหมาะกับผิว</p>
        <div class="flex flex-col gap-1">
          <For each={SKIN_TYPE_LABELS}>
            {(label) => (
              <div class="flex min-h-[36px] w-full cursor-not-allowed items-center gap-2 py-0.5 opacity-40" title="ยังไม่มีข้อมูลผิวในสินค้านี้">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-md border border-ink-placeholder bg-white" aria-hidden="true" />
                <span class="flex-1 text-sm text-ink">{label}</span>
                <span class="text-sm text-ink-gray">0</span>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-base font-semibold text-ink">ช่วงราคา</p>
        <div class="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={bounds().min}
            max={props.draft.maxPrice ?? bounds().max}
            value={props.draft.minPrice ?? ""}
            placeholder={`${bounds().min}.-`}
            onInput={(e) => {
              const v = e.currentTarget.value;
              props.onChange({ ...props.draft, minPrice: v === "" ? null : Number(v) });
            }}
            aria-label="ราคาต่ำสุด"
            class="h-10 w-full min-w-0 rounded-2xl border border-surface-gray bg-white px-3 text-center text-sm text-ink outline-none focus:border-brand-pink"
          />
          <span class="shrink-0 text-ink-placeholder" aria-hidden="true">
            —
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={props.draft.minPrice ?? bounds().min}
            max={bounds().max}
            value={props.draft.maxPrice ?? ""}
            placeholder={`${bounds().max}.-`}
            onInput={(e) => {
              const v = e.currentTarget.value;
              props.onChange({ ...props.draft, maxPrice: v === "" ? null : Number(v) });
            }}
            aria-label="ราคาสูงสุด"
            class="h-10 w-full min-w-0 rounded-2xl border border-surface-gray bg-white px-3 text-center text-sm text-ink outline-none focus:border-brand-pink"
          />
        </div>
        <div class="relative flex h-6 items-center">
          <input
            type="range"
            min={bounds().min}
            max={bounds().max}
            value={props.draft.minPrice ?? bounds().min}
            aria-label="ราคาต่ำสุด (แถบเลื่อน)"
            onInput={(e) => {
              const v = Math.min(Number(e.currentTarget.value), props.draft.maxPrice ?? bounds().max);
              props.onChange({ ...props.draft, minPrice: v });
            }}
            class="range-thumb pointer-events-none absolute inset-x-0 h-1.5 w-full appearance-none bg-transparent"
          />
          <input
            type="range"
            min={bounds().min}
            max={bounds().max}
            value={props.draft.maxPrice ?? bounds().max}
            aria-label="ราคาสูงสุด (แถบเลื่อน)"
            onInput={(e) => {
              const v = Math.max(Number(e.currentTarget.value), props.draft.minPrice ?? bounds().min);
              props.onChange({ ...props.draft, maxPrice: v });
            }}
            class="range-thumb pointer-events-none absolute inset-x-0 h-1.5 w-full appearance-none bg-transparent"
          />
          <div class="pointer-events-none h-1.5 w-full rounded-pill bg-ink-placeholder">
            <div
              class="h-full rounded-pill bg-brand-pink"
              style={{
                "margin-left": `${(((props.draft.minPrice ?? bounds().min) - bounds().min) / (bounds().max - bounds().min || 1)) * 100}%`,
                width: `${(((props.draft.maxPrice ?? bounds().max) - (props.draft.minPrice ?? bounds().min)) / (bounds().max - bounds().min || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <Button type="button" variant="primary" class="w-full" onClick={props.onApply}>
          {props.applyLabel ?? "ใช้ตัวกรอง"}
        </Button>
        <Button type="button" variant="outline" class="w-full" onClick={props.onReset}>
          ล้างตัวกรอง
        </Button>
      </div>
    </div>
  );
}
