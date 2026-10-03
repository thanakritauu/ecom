import { createMemo, createSignal } from "solid-js";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { ProductListingToolbar, type ListingView } from "~/components/products/ProductListingToolbar";
import { ProductListingGrid } from "~/components/products/ProductListingGrid";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCategoryContent } from "~/lib/categoryContent";
import { PAGE_SIZE, sortProducts, type SortValue } from "~/lib/productListing";

/**
 * Reusable Category Product Listing template (FACE/BROW/EYE/CHEEK/LIP) —
 * one template, driven by `categorySlug`/`categoryTitle` props, instead of
 * five copy-pasted page components. Deliberately reuses the exact same
 * pieces `/products` (All Products) already assembles —
 * `ProductListingToolbar`/`ProductListingGrid`/`ProductCard` (via the
 * Grid)/`Breadcrumb`/`Container` — so a Category page reads as "All Products,
 * filtered to one category," never a second, independently-designed page.
 * The one deliberate structural difference from `/products`: no Filter
 * Sidebar/`FilterPanel`/`AppliedFilters`/`MobileFilterDrawer` at all (every
 * Category page's product set already *is* the filter).
 *
 * Product data is the real, live Product Store (`useProductCatalog()`) —
 * same one Home/PDP/Cart/`/products` all share — filtered by the real
 * `AdminProduct.categoryId` relationship (`getByCategory`, the same
 * `productsInCategory` derivation `/products`'s own facets use). No mock
 * layer, no duplicated Product data: a category with no real products
 * assigned to it (today: BROW/FACE) simply renders `ProductListingGrid`'s
 * existing empty state, never a fake product.
 */
export function CategoryListingPage(props: { categorySlug: string; categoryTitle: string }) {
  const catalog = useProductCatalog();
  const categoryContent = useCategoryContent();

  const category = createMemo(() => categoryContent.categories().find((c) => c.slug === props.categorySlug));
  const allProducts = createMemo(() => {
    const c = category();
    return c ? catalog.getByCategory(c.id) : [];
  });

  const [sort, setSort] = createSignal<SortValue>("popular");
  const [view, setView] = createSignal<ListingView>("grid");
  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = createSignal(false);

  const sorted = createMemo(() => sortProducts(allProducts(), sort()));
  const visibleProducts = createMemo(() => sorted().slice(0, visibleCount()));

  const handleSortChange = (next: SortValue) => {
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
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-white py-6">
        <Container width="wide" class="flex flex-col gap-4">
          <ProductListingToolbar
            title={props.categoryTitle}
            resultCount={sorted().length}
            totalCount={allProducts().length}
            view={view()}
            onViewChange={setView}
            sort={sort()}
            onSortChange={handleSortChange}
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
        </Container>
      </main>
      <Footer />
    </>
  );
}
