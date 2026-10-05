import type { Product } from "./types";
import { isNewArrival } from "./products";

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

/**
 * Figma's "เหมาะกับผิว" (skin type) filter group has zero corresponding
 * Product Data field at all — not even a partial mapping like the category
 * group above. Adding a `skinType` field to every product just to make this
 * group real would be inventing a new dataset dimension nothing requested;
 * it's kept purely as an inert, disabled display group (count always 0) so
 * the sidebar still matches Figma's visual, documented as an Issue in the
 * final report rather than faked.
 */
export const SKIN_TYPE_LABELS = ["ผิวมัน", "ผิวแห้ง", "ผิวผสม", "ผิวแพ้ง่าย"] as const;

/** Architecture Cleanup & Source of Truth — takes the live product list from the caller (`useProductCatalog().products()`/`useAdminProducts().products()`) instead of reading a static `allProducts` import, so the count reacts to Admin edits. Facets are likewise supplied by the caller (`buildCategoryFacets()` over the live Category store), never read from a module-level constant. */
export function categoryCount(key: CategoryFacetKey, products: Product[], facets: CategoryFacet[]): number {
  const facet = facets.find((f) => f.key === key);
  return facet ? products.filter(facet.matches).length : 0;
}

/** Same reasoning as `categoryCount` — computed from whatever product list is currently live, not a static catalog captured at module-load time. */
export function getPriceBounds(products: Product[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...products.map((p) => p.price)),
    max: Math.max(...products.map((p) => p.price)),
  };
}

export type ProductFilters = {
  search: string;
  categories: CategoryFacetKey[];
  minPrice: number | null;
  maxPrice: number | null;
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

export const EMPTY_FILTERS: ProductFilters = { search: "", categories: [], minPrice: null, maxPrice: null, collectionProductIds: null, brandId: null };

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.brandId != null ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.collectionProductIds != null
  );
}

export function filterProducts(products: Product[], filters: ProductFilters, facets: CategoryFacet[]): Product[] {
  const query = filters.search.trim().toLowerCase();
  return products.filter((product) => {
    if (query && !product.name.toLowerCase().includes(query)) return false;
    if (filters.categories.length > 0) {
      const matchesCategory = filters.categories.some((key) => facets.find((f) => f.key === key)?.matches(product));
      if (!matchesCategory) return false;
    }
    if (filters.collectionProductIds && !filters.collectionProductIds.includes(product.id)) return false;
    if (filters.brandId != null && product.brandId !== filters.brandId) return false;
    if (filters.minPrice != null && product.price < filters.minPrice) return false;
    if (filters.maxPrice != null && product.price > filters.maxPrice) return false;
    return true;
  });
}

/**
 * "มาใหม่" reuses `newArrivalProducts` membership (an already-real, existing
 * curated array in products.ts) as the "is this new" signal instead of
 * adding a fabricated `createdAt` field to Product just for this sort. Every
 * other option here sorts by a field the Product type already has.
 */
export type SortValue = "popular" | "new" | "bestselling" | "price-asc" | "price-desc" | "rating";

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "popular", label: "ยอดนิยม" },
  { value: "new", label: "มาใหม่" },
  { value: "bestselling", label: "สินค้าขายดี" },
  { value: "price-asc", label: "ราคาต่ำ → สูง" },
  { value: "price-desc", label: "ราคาสูง → ต่ำ" },
  { value: "rating", label: "คะแนนสูง" },
];

export function sortProducts(products: Product[], sort: SortValue): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "new":
      return sorted.sort((a, b) => Number(isNewArrival(b)) - Number(isNewArrival(a)));
    case "bestselling":
      return sorted.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "popular":
    default:
      return sorted; // curated catalog order — this IS the "ยอดนิยม" order Figma shows by default
  }
}

/** Matches Figma's 3x3 (9-card) grid exactly — "Load More" reveals another 9. */
export const PAGE_SIZE = 12; // divides evenly into the 2/3/4-column grids
