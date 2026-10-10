import { Dialog } from "@kobalte/core/dialog";
import type { CategoryFacet, CategoryFacetKey, ProductFilters } from "~/lib/productListing";
import type { Product } from "~/lib/types";
import { FilterPanel } from "./FilterPanel";
import { CloseMark } from "../shared/icons";

/**
 * PART 24: mobile must not shrink the desktop sidebar — it gets a real
 * bottom-sheet instead; category toggles apply instantly and its CTA (the
 * live result count) just closes the sheet. Same Kobalte Dialog pattern as CartDrawer, just sliding from the
 * bottom (`sheet-in`/`sheet-out`) instead of the side.
 */
export function MobileFilterDrawer(props: {
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ProductFilters;
  facets: CategoryFacet[];
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
                class="group -mr-1.5 flex size-11 items-center justify-center"
              >
                <CloseMark />
              </Dialog.CloseButton>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <FilterPanel
                products={props.products}
                draft={props.draft}
                facets={props.facets}
                onToggleCategory={props.onToggleCategory}
                onApply={props.onApply}
                onReset={props.onReset}
                applyLabel="ตกลง"
              />
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
