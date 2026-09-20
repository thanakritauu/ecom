import type { Product } from "./types";
import { isNewArrival } from "./products";

/**
 * Figma (node 146:13795) shows a "ประเภทการใช้งาน" filter group with 6
 * options, but `Product.category` (types.ts) only ever takes 3 real values
 * (`"eye" | "cheek" | "lip"`) — the other 3 Figma labels (foundation,
 * bronzer, tools) have no corresponding attribute anywhere in the product
 * data and no product in the catalog belongs to them. Per the rule against
 * inventing new Product Dataset fields just to satisfy a mockup, those 3
 * facets are kept here (so the filter UI still matches Figma visually) but
 * `matches` always returns false — their real, honest count is 0, and the
 * UI disables them rather than pretending they filter anything.
 */
export type CategoryFacetKey = "lip" | "foundation" | "eye" | "cheek" | "bronzer" | "tools";

export type CategoryFacet = {
  key: CategoryFacetKey;
  label: string;
  matches: (product: Product) => boolean;
};

export const CATEGORY_FACETS: CategoryFacet[] = [
  { key: "lip", label: "ลิป", matches: (p) => p.category === "lip" },
  { key: "foundation", label: "รองพื้น / คุมมัน", matches: () => false },
  { key: "eye", label: "อายแชโดว์", matches: (p) => p.category === "eye" },
  { key: "cheek", label: "บลัชออน / ไฮไลท์", matches: (p) => p.category === "cheek" },
  { key: "bronzer", label: "บอนเซอร์ / เฉดสี", matches: () => false },
  { key: "tools", label: "อุปกรณ์แต่งหน้า", matches: () => false },
];

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

/** Architecture Cleanup & Source of Truth — takes the live product list from the caller (`useProductCatalog().products()`/`useAdminProducts().products()`) instead of reading a static `allProducts` import, so the count reacts to Admin edits. */
export function categoryCount(key: CategoryFacetKey, products: Product[]): number {
  const facet = CATEGORY_FACETS.find((f) => f.key === key);
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
};

export const EMPTY_FILTERS: ProductFilters = { search: "", categories: [], minPrice: null, maxPrice: null, collectionProductIds: null };

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.collectionProductIds != null
  );
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const query = filters.search.trim().toLowerCase();
  return products.filter((product) => {
    if (query && !product.name.toLowerCase().includes(query)) return false;
    if (filters.categories.length > 0) {
      const matchesCategory = filters.categories.some((key) => CATEGORY_FACETS.find((f) => f.key === key)?.matches(product));
      if (!matchesCategory) return false;
    }
    if (filters.collectionProductIds && !filters.collectionProductIds.includes(product.id)) return false;
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
export const PAGE_SIZE = 9;
