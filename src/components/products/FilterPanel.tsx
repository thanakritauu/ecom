import { For, Show } from "solid-js";
import { categoryCount, type ProductFilters, type CategoryFacet, type CategoryFacetKey } from "~/lib/productListing";
import type { Product } from "~/lib/types";
import { Button } from "../shared/Button";
import { CheckIcon } from "../shared/icons";

/**
 * Shared Filter UI — the exact same component renders inline in the desktop
 * sidebar and inside the mobile drawer (see MobileFilterDrawer.tsx), per
 * PART 23/24's "one Filter System, not two".
 *
 * "ประเภทการใช้งาน" (category) is the only group — an Instant Filter per
 * direct request: `onToggleCategory` applies immediately. The price-range
 * and "เหมาะกับผิว" groups were removed, so there's nothing left to "apply":
 * the desktop sidebar only offers "ล้างตัวกรอง", and the mobile drawer adds
 * its "แสดง N รายการ" button (pass `applyLabel`) to close itself.
 * No search box here — searching is the header's autocomplete search
 * (`/products?search=`), shown above the grid as a removable chip.
 */
export function FilterPanel(props: {
  products: Product[];
  draft: ProductFilters;
  facets: CategoryFacet[];
  onToggleCategory: (key: CategoryFacetKey) => void;
  /** Mobile drawer only — closes it. */
  onApply?: () => void;
  onReset: () => void;
  applyLabel?: string;
}) {
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
        <Show when={props.applyLabel}>
          <Button type="button" variant="primary" class="w-full" onClick={props.onApply}>
            {props.applyLabel}
          </Button>
        </Show>
        <Button type="button" variant="outline" class="w-full" onClick={props.onReset}>
          ล้างตัวกรอง
        </Button>
      </div>
    </div>
  );
}
