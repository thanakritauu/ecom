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
}) {
  const gridClass = () => (props.view === "list" ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5");

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
