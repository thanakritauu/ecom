import { createMemo, createSignal, on, createEffect } from "solid-js";
import type { Product } from "~/lib/types";
import { PAGE_SIZE, sortProducts, type SortValue } from "~/lib/productListing";
import { ProductListingToolbar, type ListingView } from "./ProductListingToolbar";
import { ProductListingGrid } from "./ProductListingGrid";

/**
 * A fixed set of products (a category, a Promotion page's products) shown as a listing: the count + grid/list
 * toggle + sort row, then the grid with "load more". No filters — the set already is the filter. Shared by the
 * Category pages and the Promotion pages so every nav page lists products the same way.
 */
export function ProductCollectionListing(props: { products: Product[] }) {
  const [sort, setSort] = createSignal<SortValue>("popular");
  const [view, setView] = createSignal<ListingView>("grid");
  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = createSignal(false);

  const sorted = createMemo(() => sortProducts(props.products, sort()));
  const visibleProducts = createMemo(() => sorted().slice(0, visibleCount()));
  // A different product set (e.g. catalog finished loading) starts again from the first page.
  createEffect(on(() => props.products, () => setVisibleCount(PAGE_SIZE), { defer: true }));

  const changeSort = (next: SortValue) => {
    setSort(next);
    setVisibleCount(PAGE_SIZE);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 200));
    setVisibleCount((n) => n + PAGE_SIZE);
    setLoadingMore(false);
  };

  return (
    <>
      <ProductListingToolbar
        hideTitle
        totalCount={sorted().length}
        view={view()}
        onViewChange={setView}
        sort={sort()}
        onSortChange={changeSort}
        activeFilterCount={0}
      />
      <ProductListingGrid
        products={visibleProducts()}
        view={view()}
        status="idle"
        hasActiveFilters={false}
        hasMore={visibleCount() < sorted().length}
        loadingMore={loadingMore()}
        onLoadMore={loadMore}
        onRetry={() => {}}
        onClearFilters={() => {}}
        fullWidth
      />
    </>
  );
}
