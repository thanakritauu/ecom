import { Dialog } from "@kobalte/core/dialog";
import type { CategoryFacet, CategoryFacetKey, ProductFilters } from "~/lib/productListing";
import type { Product } from "~/lib/types";
import { FilterPanel } from "./FilterPanel";

/**
 * PART 24: mobile must not shrink the desktop sidebar — it gets a real
 * bottom-sheet with an explicit Apply step (Open → Select → Review → Apply
 * → Close) instead, its CTA showing the live result count for the draft
 * filters. Same Kobalte Dialog pattern as CartDrawer, just sliding from the
 * bottom (`sheet-in`/`sheet-out`) instead of the side.
 */
export function MobileFilterDrawer(props: {
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ProductFilters;
  facets: CategoryFacet[];
  onChange: (next: ProductFilters) => void;
  onToggleCategory: (key: CategoryFacetKey) => void;
  onApply: () => void;
  onReset: () => void;
  resultCount: number;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col">
          <Dialog.Content class="flex max-h-[85vh] flex-col overflow-hidden rounded-t-card bg-white shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-sheet-in data-[closed]:animate-sheet-out">
            <div class="flex shrink-0 items-center justify-between border-b border-surface-gray px-4 py-3">
              <Dialog.Title class="text-lg font-semibold text-ink">ตัวกรอง</Dialog.Title>
              <Dialog.CloseButton
                aria-label="ปิดตัวกรอง"
                class="flex size-11 items-center justify-center rounded-pill bg-surface-gray text-ink transition-colors duration-150 hover:bg-surface-gray/70"
              >
                <CloseIcon />
              </Dialog.CloseButton>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <FilterPanel
                products={props.products}
                draft={props.draft}
                facets={props.facets}
                onChange={props.onChange}
                onToggleCategory={props.onToggleCategory}
                onApply={props.onApply}
                onReset={props.onReset}
                applyLabel={`แสดง ${props.resultCount} รายการ`}
              />
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
    </svg>
  );
}
