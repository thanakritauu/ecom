import { createEffect, createMemo, createSignal, on, Show, untrack } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { FilterPanel } from "~/components/products/FilterPanel";
import { MobileFilterDrawer } from "~/components/products/MobileFilterDrawer";
import { AppliedFilters } from "~/components/products/AppliedFilters";
import { ListingHeading } from "~/components/products/ListingHeading";
import { ProductListingToolbar, type ListingView } from "~/components/products/ProductListingToolbar";
import { ProductListingGrid } from "~/components/products/ProductListingGrid";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCollectionContent } from "~/lib/collectionContent";
import { useCategoryContent } from "~/lib/categoryContent";
import {
  buildCategoryFacets,
  EMPTY_FILTERS,
  PAGE_SIZE,
  filterProducts,
  hasActiveFilters,
  sortProducts,
  parseSortValue,
  DEFAULT_SORT,
  type CategoryFacet,
  type CategoryFacetKey,
  type ProductFilters,
  type SortValue,
} from "~/lib/productListing";

const isCategoryKey = (v: string, facets: CategoryFacet[]): v is CategoryFacetKey => facets.some((f) => f.key === v);

/**
 * `resolveCollectionProductIds` is injected rather than imported directly —
 * this function has no Solid context access of its own (it's called from
 * plain module scope, not a component), so the caller (`ProductsPage`, which
 * *does* have `useCollectionContent()`) resolves the `collection` param into
 * a product-id list and hands it in. `facets` is the same idea for Category —
 * this module has no store access, so the live, active-Category-derived
 * facet list (`buildCategoryFacets()`) is passed in rather than read from a
 * module-level constant.
 */
function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
  resolveCollectionProductIds: (id: string) => string[] | null,
  facets: CategoryFacet[],
): ProductFilters {
  const categoriesRaw = params.category;
  const categories = (Array.isArray(categoriesRaw) ? categoriesRaw : categoriesRaw ? categoriesRaw.split(",") : []).filter((v) =>
    isCategoryKey(v, facets),
  );
  const collectionParam = typeof params.collection === "string" ? params.collection : undefined;
  return {
    search: typeof params.search === "string" ? params.search : "",
    categories,
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
  const categories = useCategoryContent();
  const catalog = useProductCatalog();
  const products = catalog.products;

  /** §7/§8/§26 — the live, active-Category-derived facet list every category-matching call below resolves against; never a module-level constant, so a renamed/added/deactivated Category is reflected immediately. */
  const facets = () => buildCategoryFacets(categories.categories().filter((c) => c.status === "active"));

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

  const [appliedFilters, setAppliedFilters] = createSignal<ProductFilters>(
    filtersFromParams(searchParams, resolveCollectionProductIds, facets()),
  );
  const [draftFilters, setDraftFilters] = createSignal<ProductFilters>(appliedFilters());
  const [sort, setSort] = createSignal<SortValue>(parseSortValue(searchParams.sort));
  const [view, setView] = createSignal<ListingView>((searchParams.view as ListingView) === "list" ? "list" : "grid");
  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [mobileFilterOpen, setMobileFilterOpen] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");
  const [loadingMore, setLoadingMore] = createSignal(false);

  const filteredSorted = createMemo(() => sortProducts(filterProducts(products(), appliedFilters(), facets()), sort()));
  const visibleProducts = createMemo(() => filteredSorted().slice(0, visibleCount()));
  const draftResultCount = createMemo(() => filterProducts(products(), draftFilters(), facets()).length);

  // A new search from the header while already on this page only changes `?search=` — pick it up (the
  // effect below writes the same value back, so the two never loop).
  createEffect(
    on(
      () => (typeof searchParams.search === "string" ? searchParams.search : ""),
      (search) => {
        if (search === appliedFilters().search) return;
        setAppliedFilters((f) => ({ ...f, search }));
        setDraftFilters((f) => ({ ...f, search }));
        setVisibleCount(PAGE_SIZE);
      },
      { defer: true },
    ),
  );

  // Keep the URL in sync with applied state — real navigation (refresh, back/forward, share link) all work.
  createEffect(
    on([appliedFilters, sort, view, collectionId], ([filters, sortValue, viewValue, collection]) => {
      setSearchParams(
        {
          category: filters.categories.length ? filters.categories.join(",") : undefined,
          // Retired price-range params — always cleared so an old shared link doesn't keep them around.
          min: undefined,
          max: undefined,
          search: filters.search || undefined,
          sort: sortValue === DEFAULT_SORT ? undefined : sortValue,
          view: viewValue === "grid" ? undefined : viewValue,
          collection: collection ?? undefined,
          // Retired brand filter (the store sells only Charmiss) — cleared from old shared links too.
          brand: undefined,
        },
        { replace: true },
      );
    }),
  );

  /** Simulates a real fetch: mock latency + a small chance to fail, so Loading/Error/Retry are genuinely exercised (same pattern as cart.addLine/auth.login). Reserved for the heavier, explicit-submit moments (initial load, Sort) — NOT category toggling, which must feel instant. */
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
   * instant and fluid" requirement. Also used for chip removal (search or
   * category) and Clear All, since "remove a filter" is the same kind of
   * immediate, already-applied-state edit as toggling a checkbox.
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

  // Category toggles already applied instantly — the drawer's "แสดง N รายการ" just closes it.
  const applyFilters = () => setMobileFilterOpen(false);

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
      <main class="flex flex-col overflow-x-hidden bg-white pb-6 pt-6 sm:pt-8 lg:pt-10">
        <Container width="wide" class="flex flex-col gap-3 sm:gap-4">
          <Show
            when={appliedFilters().search.trim()}
            fallback={<ListingHeading title="สินค้าทั้งหมด" description="รวมทุกผลิตภัณฑ์ความงามจาก Charmiss ไว้ในที่เดียว เลือกช้อปได้ตามใจ" />}
          >
            {(q) => <ListingHeading title={`ผลการค้นหา "${q()}"`} description={`พบสินค้า ${filteredSorted().length} รายการ`} />}
          </Show>
          <ProductListingToolbar
            hideTitle
            totalCount={filteredSorted().length}
            view={view()}
            onViewChange={setView}
            sort={sort()}
            onSortChange={setSort}
            activeFilterCount={appliedFilters().categories.length}
            onOpenMobileFilter={() => {
              setDraftFilters(appliedFilters());
              setMobileFilterOpen(true);
            }}
          />

          <Show when={hasActiveFilters(appliedFilters())}>
            <AppliedFilters products={products()} filters={appliedFilters()} facets={facets()} onChange={applyInstant} onClearAll={resetFilters} />
          </Show>

          <div class="flex w-full items-start gap-6">
            <div class="hidden w-[280px] shrink-0 lg:block">
              <FilterPanel
                products={products()}
                draft={draftFilters()}
                facets={facets()}
                onToggleCategory={toggleCategoryInstant}
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
                searchQuery={appliedFilters().search}
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
        facets={facets()}
        onToggleCategory={toggleCategoryInstant}
        onApply={applyFilters}
        onReset={resetFilters}
        resultCount={draftResultCount()}
      />
    </>
  );
}
