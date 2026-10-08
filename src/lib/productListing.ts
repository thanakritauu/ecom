import type { Product } from "./types";
import { matchesSearch } from "./productSearch";

/**
 * Product / Category / Brand / Collection Source-of-Truth Cleanup (§4/§8/§26)
 * — this used to be a fixed 6-key union matched against the legacy
 * `Product.category` 3-value enum. Category is now the one live
 * classification relationship (`Product.categoryId` → `AdminCategory.id`),
 * so the real facets are built from whatever Categories are actually active
 * (`buildCategoryFacets`, below) — every real, active Category is filterable
 * here, not just the 3 that happened to have a legacy enum value. `key` is
 * the Category's own `slug` (matches `categoryListHref`'s URL shape, so
 * `/products?category=<slug>` from Navigation/a Promotion Page CTA/the
 * Header's category row all resolve here identically).
 */
export type CategoryFacetKey = string;

export type CategoryFacet = {
  key: CategoryFacetKey;
  label: string;
  matches: (product: Product) => boolean;
};

/** Real Category facets, in the order the caller passes them (storage order — Category has no Display Order field). */
export function buildCategoryFacets(activeCategories: { id: string; slug: string; name: string }[]): CategoryFacet[] {
  return activeCategories.map((c) => ({
    key: c.slug,
    label: c.name,
    matches: (p: Product) => p.categoryId === c.id,
  }));
}

/** Architecture Cleanup & Source of Truth — takes the live product list from the caller (`useProductCatalog().products()`/`useAdminProducts().products()`) instead of reading a static `allProducts` import, so the count reacts to Admin edits. Facets are likewise supplied by the caller (`buildCategoryFacets()` over the live Category store), never read from a module-level constant. */
export function categoryCount(key: CategoryFacetKey, products: Product[], facets: CategoryFacet[]): number {
  const facet = facets.find((f) => f.key === key);
  return facet ? products.filter(facet.matches).length : 0;
}

export type ProductFilters = {
  search: string;
  categories: CategoryFacetKey[];
  /**
   * Global Frontend Navigation Architecture — set when arriving via a
   * Collection destination (`/products?collection=<id>`, see
   * `collectionListHref` in `adminHomepage.ts`). This module has no store
   * access, so the caller (`routes/products.tsx`) resolves the Collection's
   * product ids via `useCollectionContent()` and passes the resolved list
   * in here; `null` means no collection filter is active. This is the same
   * *existing* Product List page a Category destination resolves to — this
   * phase does not add a dedicated Collection landing page.
   */
  collectionProductIds: string[] | null;
  /**
   * §25/§26 — set when arriving via `/products?brand=<slug>` (a Brand
   * resolver → Product Catalog flow, same shape as Category/Collection
   * above). This module has no store access, so the caller resolves the
   * Brand's id via `useBrandContent()` and passes it in here; `null` means
   * no brand filter is active. There is still no dedicated `/brand/:slug`
   * page — this is the same existing Product Listing page every other
   * destination resolves to.
   */
  brandId: string | null;
};

export const EMPTY_FILTERS: ProductFilters = { search: "", categories: [], collectionProductIds: null, brandId: null };

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.brandId != null ||
    filters.collectionProductIds != null
  );
}

export function filterProducts(products: Product[], filters: ProductFilters, facets: CategoryFacet[]): Product[] {
  return products.filter((product) => {
    // Same matcher as the header autocomplete, so its "ดูผลการค้นหาทั้งหมด (N)" equals this page's count.
    if (!matchesSearch(product.name, filters.search)) return false;
    if (filters.categories.length > 0) {
      const matchesCategory = filters.categories.some((key) => facets.find((f) => f.key === key)?.matches(product));
      if (!matchesCategory) return false;
    }
    if (filters.collectionProductIds && !filters.collectionProductIds.includes(product.id)) return false;
    if (filters.brandId != null && product.brandId !== filters.brandId) return false;
    return true;
  });
}

/**
 * "ยอดนิยม" and "มาใหม่" were dropped; "แนะนำ" (the curated catalog order)
 * is the default. Every other option sorts by a field the Product type
 * already has. `parseSortValue` maps anything else — including the retired
 * `popular` / `new` values in old shared links — back to the default.
 */
export type SortValue = "recommended" | "bestselling" | "price-asc" | "price-desc" | "rating";

export const DEFAULT_SORT: SortValue = "recommended";

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "recommended", label: "แนะนำ" },
  { value: "bestselling", label: "สินค้าขายดี" },
  { value: "price-asc", label: "ราคาต่ำ → สูง" },
  { value: "price-desc", label: "ราคาสูง → ต่ำ" },
  { value: "rating", label: "คะแนนสูง" },
];

export function parseSortValue(raw: unknown): SortValue {
  return SORT_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_SORT;
}

export function sortProducts(products: Product[], sort: SortValue): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "bestselling":
      return sorted.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "recommended":
    default:
      return sorted; // curated catalog order
  }
}

/** Matches Figma's 3x3 (9-card) grid exactly — "Load More" reveals another 9. */
export const PAGE_SIZE = 12; // divides evenly into the 2/3/4-column grids
