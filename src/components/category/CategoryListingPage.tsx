import { createMemo } from "solid-js";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { ListingHeading } from "~/components/products/ListingHeading";
import { ProductCollectionListing } from "~/components/products/ProductCollectionListing";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCategoryContent } from "~/lib/categoryContent";

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
  const products = createMemo(() => {
    const c = category();
    return c ? catalog.getByCategory(c.id) : [];
  });

  return (
    <>
      <Header />
      {/* Same layout as every nav page: centred heading, then the view/sort row, then the products. */}
      <main class="flex flex-col overflow-x-hidden bg-white pb-6 pt-6 sm:pt-8 lg:pt-10">
        <Container width="wide" class="flex flex-col gap-3 sm:gap-4">
          <ListingHeading title={category()?.name || props.categoryTitle} description={category()?.description} />
          <ProductCollectionListing products={products()} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
