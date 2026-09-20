import { createEffect, createMemo, createSignal, on, Show, untrack } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { FilterPanel } from "~/components/products/FilterPanel";
import { MobileFilterDrawer } from "~/components/products/MobileFilterDrawer";
import { AppliedFilters } from "~/components/products/AppliedFilters";
import { ProductListingToolbar, type ListingView } from "~/components/products/ProductListingToolbar";
import { ProductListingGrid } from "~/components/products/ProductListingGrid";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCollectionContent } from "~/lib/collectionContent";
import {
  CATEGORY_FACETS,
  EMPTY_FILTERS,
  PAGE_SIZE,
  filterProducts,
  hasActiveFilters,
  sortProducts,
  type CategoryFacetKey,
  type ProductFilters,
  type SortValue,
} from "~/lib/productListing";

const SORT_VALUES: SortValue[] = ["popular", "new", "bestselling", "price-asc", "price-desc", "rating"];
const isSortValue = (v: string): v is SortValue => (SORT_VALUES as string[]).includes(v);
const isCategoryKey = (v: string): v is CategoryFacetKey => CATEGORY_FACETS.some((f) => f.key === v);

/**
 * `resolveCollectionProductIds` is injected rather than imported directly —
 * this function has no Solid context access of its own (it's called from
 * plain module scope, not a component), so the caller (`ProductsPage`, which
 * *does* have `useCollectionContent()`) resolves the `collection` param into
 * a product-id list and hands it in.
 */
function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
  resolveCollectionProductIds: (id: string) => string[] | null,
): ProductFilters {
  const categoriesRaw = params.category;
  const categories = (Array.isArray(categoriesRaw) ? categoriesRaw : categoriesRaw ? categoriesRaw.split(",") : []).filter(isCategoryKey);
  const min = params.min ? Number(params.min) : null;
  const max = params.max ? Number(params.max) : null;
  const collectionParam = typeof params.collection === "string" ? params.collection : undefined;
  return {
    search: typeof params.search === "string" ? params.search : "",
    categories,
    minPrice: min != null && !Number.isNaN(min) ? min : null,
    maxPrice: max != null && !Number.isNaN(max) ? max : null,
    collectionProductIds: collectionParam ? resolveCollectionProductIds(collectionParam) : null,
  };
}

/**
 * Figma node 146:13795. Product Listing Foundation: Product Data (Product
 * Store, via `useProductCatalog()` — Architecture Cleanup & Source of Truth,
 * no independent dataset here anymore) → Filter → Sort → Pagination → Grid
 * (productListing.ts owns the pure filter/sort logic; this route owns the
 * state and wires it to the URL so refresh/back-forward/share-link all
 * preserve context, per PART 29).
 */
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const collections = useCollectionContent();
  const catalog = useProductCatalog();
  const products = catalog.products;

  /**
   * Global Frontend Navigation Architecture — resolved once at setup time,
   * not re-derived reactively on every collections change: a Collection
   * destination is an "arrival context" (like Category), not a live filter
   * control anything in this page's own UI edits afterward. Correct on the
   * very first paint (SSR included) because `useCollectionContent()`'s
   * signal is seeded with the real baseline, not `[]` (see
   * `collectionContent.tsx`).
   */
  const resolveCollectionProductIds = (id: string): string[] | null => {
    const collection = collections.getUsableById(id);
    return collection ? collection.products.map((ref) => ref.productId) : null;
  };
  const [collectionId, setCollectionId] = createSignal<string | undefined>(
    typeof searchParams.collection === "string" ? searchParams.collection : undefined,
  );

  const [appliedFilters, setAppliedFilters] = createSignal<ProductFilters>(filtersFromParams(searchParams, resolveCollectionProductIds));
  const [draftFilters, setDraftFilters] = createSignal<ProductFilters>(appliedFilters());
  const [sort, setSort] = createSignal<SortValue>(isSortValue(searchParams.sort ?? "") ? (searchParams.sort as SortValue) : "popular");
  const [view, setView] = createSignal<ListingView>((searchParams.view as ListingView) === "list" ? "list" : "grid");
  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [mobileFilterOpen, setMobileFilterOpen] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");
  const [loadingMore, setLoadingMore] = createSignal(false);

  const filteredSorted = createMemo(() => sortProducts(filterProducts(products(), appliedFilters()), sort()));
  const visibleProducts = createMemo(() => filteredSorted().slice(0, visibleCount()));
  const draftResultCount = createMemo(() => filterProducts(products(), draftFilters()).length);

  // Keep the URL in sync with applied state — real navigation (refresh, back/forward, share link) all work.
  createEffect(
    on([appliedFilters, sort, view, collectionId], ([filters, sortValue, viewValue, collection]) => {
      setSearchParams(
        {
          category: filters.categories.length ? filters.categories.join(",") : undefined,
          min: filters.minPrice ?? undefined,
          max: filters.maxPrice ?? undefined,
          search: filters.search || undefined,
          sort: sortValue === "popular" ? undefined : sortValue,
          view: viewValue === "grid" ? undefined : viewValue,
          collection: collection ?? undefined,
        },
        { replace: true },
      );
    }),
  );

  /** Simulates a real fetch: mock latency + a small chance to fail, so Loading/Error/Retry are genuinely exercised (same pattern as cart.addLine/auth.login). Reserved for the heavier, explicit-submit moments (initial load, Sort, price/search Apply) — NOT category toggling, which must feel instant. */
  const runListingLoad = async () => {
    setStatus("loading");
    setVisibleCount(PAGE_SIZE);
    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));
    if (Math.random() < 0.05) {
      setStatus("error");
      return;
    }
    setStatus("idle");
  };

  createEffect(
    on(
      sort,
      () => {
        untrack(() => void runListingLoad());
      },
      { defer: true }, // only on a real sort change — initial load is triggered explicitly below
    ),
  );
  void runListingLoad(); // initial load

  /**
   * "ประเภทการใช้งาน" Instant Filter: apply synchronously, no fake latency,
   * no skeleton — filtering 54 in-memory products is genuinely instant, and
   * simulating a network round-trip here would fight the explicit "feels
   * instant and fluid" requirement. Also used for chip removal (any type,
   * category or price) and Clear All, since "remove a filter" is the same
   * kind of immediate, already-applied-state edit as toggling a checkbox —
   * only *adding/editing* the price range still goes through the sidebar's
   * explicit Apply button.
   */
  const applyInstant = (next: ProductFilters) => {
    setAppliedFilters(next);
    setDraftFilters(next);
    setVisibleCount(PAGE_SIZE);
    setStatus("idle");
  };

  const toggleCategoryInstant = (key: CategoryFacetKey) => {
    const current = appliedFilters();
    const has = current.categories.includes(key);
    applyInstant({ ...current, categories: has ? current.categories.filter((k) => k !== key) : [...current.categories, key] });
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters());
    setMobileFilterOpen(false);
    void runListingLoad();
  };

  const resetFilters = () => {
    applyInstant(EMPTY_FILTERS);
    setCollectionId(undefined);
    setMobileFilterOpen(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 200));
    setVisibleCount((n) => n + PAGE_SIZE);
    setLoadingMore(false);
  };

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-white py-6">
        <Container width="wide" class="flex flex-col gap-4">
          <nav aria-label="breadcrumb" class="flex items-center gap-2 text-sm">
            <A href="/" class="text-ink-gray hover:text-brand-pink">
              หน้าแรก
            </A>
            <span class="text-ink-placeholder" aria-hidden="true">
              /
            </span>
            <span class="font-medium text-ink" aria-current="page">
              สินค้าทั้งหมด
            </span>
          </nav>

          <ProductListingToolbar
            resultCount={filteredSorted().length}
            totalCount={products().length}
            view={view()}
            onViewChange={setView}
            sort={sort()}
            onSortChange={setSort}
            activeFilterCount={appliedFilters().categories.length + (hasActiveFilters(appliedFilters()) && appliedFilters().minPrice != null ? 1 : 0)}
            onOpenMobileFilter={() => {
              setDraftFilters(appliedFilters());
              setMobileFilterOpen(true);
            }}
          />

          <Show when={hasActiveFilters(appliedFilters())}>
            <AppliedFilters products={products()} filters={appliedFilters()} onChange={applyInstant} onClearAll={resetFilters} />
          </Show>

          <div class="flex w-full items-start gap-6">
            <div class="hidden w-[280px] shrink-0 lg:block">
              <FilterPanel
                products={products()}
                draft={draftFilters()}
                onChange={setDraftFilters}
                onToggleCategory={toggleCategoryInstant}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            </div>

            <div class="min-w-0 flex-1">
              <ProductListingGrid
                products={visibleProducts()}
                view={view()}
                status={status()}
                hasActiveFilters={hasActiveFilters(appliedFilters())}
                hasMore={visibleCount() < filteredSorted().length}
                loadingMore={loadingMore()}
                onLoadMore={loadMore}
                onRetry={runListingLoad}
                onClearFilters={resetFilters}
              />
            </div>
          </div>
        </Container>
      </main>
      <Footer />

      <MobileFilterDrawer
        products={products()}
        open={mobileFilterOpen()}
        onOpenChange={setMobileFilterOpen}
        draft={draftFilters()}
        onChange={setDraftFilters}
        onToggleCategory={toggleCategoryInstant}
        onApply={applyFilters}
        onReset={resetFilters}
        resultCount={draftResultCount()}
      />
    </>
  );
}
