import { For, Show } from "solid-js";
import type { Product } from "~/lib/types";
import { ProductCard } from "../shared/ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { Button } from "../shared/Button";
import type { ListingView } from "./ProductListingToolbar";

export function ProductListingGrid(props: {
  products: Product[];
  view: ListingView;
  status: "idle" | "loading" | "error";
  hasActiveFilters: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
  /**
   * Defaults to `false` — All Products' own grid caps at 3 columns because a
   * 280px Filter Sidebar shares the row with it. Category Listing pages have
   * no sidebar and use the full Container width, so they opt into `true` to
   * reach 5 columns at desktop — the exact same 2→3→4→5 breakpoint set
   * `HomepageSections.tsx`'s full-width "Product Grid" section already
   * established, not a new one invented here.
   */
  fullWidth?: boolean;
}) {
  /**
   * User-test feedback (Global Responsive pass) — Tablet must stay at 2
   * columns like Mobile, not jump to 3 early; the old `sm:`/`md:` triggers
   * (640/768px) sat inside the Tablet band itself. Moving that first step to
   * `lg:` (1024px, this project's Desktop cutoff) is the only change — every
   * column count from `lg:` up is untouched, so Desktop looks exactly as it
   * did before.
   */
  const gridClass = () =>
    props.view === "list"
      ? "grid grid-cols-1 gap-4"
      : props.fullWidth
        ? "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6"
        : "grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4"; // beside the filter sidebar: 4 across from 1280px

  return (
    <div class="flex w-full flex-col items-center gap-6">
      <Show
        when={props.status !== "error"}
        fallback={
          <div class="flex w-full flex-col items-center gap-4 py-20 text-center">
            <p class="text-ink-gray">ไม่สามารถโหลดสินค้าได้</p>
            <Button type="button" variant="primary" onClick={props.onRetry}>
              ลองอีกครั้ง
            </Button>
          </div>
        }
      >
        <Show
          when={props.status === "loading"}
          fallback={
            <Show
              when={props.products.length > 0}
              fallback={
                <div class="flex w-full flex-col items-center gap-4 py-20 text-center">
                  <p class="text-ink-gray">ไม่พบสินค้าที่ตรงกับตัวกรอง</p>
                  <Show when={props.hasActiveFilters}>
                    <Button type="button" variant="outline" onClick={props.onClearFilters}>
                      ล้างตัวกรอง
                    </Button>
                  </Show>
                </div>
              }
            >
              <div class={`w-full ${gridClass()}`}>
                <For each={props.products}>{(product) => <ProductCard product={product} variant={props.view} />}</For>
              </div>
            </Show>
          }
        >
          <div class={`w-full ${gridClass()}`}>
            <For each={Array.from({ length: 9 })}>{() => <ProductCardSkeleton variant={props.view} />}</For>
          </div>
        </Show>
      </Show>

      <Show when={props.status === "idle" && props.products.length > 0 && props.hasMore}>
        <Button type="button" variant="primary" loading={props.loadingMore} onClick={props.onLoadMore}>
          โหลดสินค้าเพิ่มเติม
        </Button>
      </Show>
    </div>
  );
}
