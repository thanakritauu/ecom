import type { AdminProduct } from "./adminProductStore";

/**
 * Admin Master Data Foundation — the one place that answers "which products
 * classify themselves under this Category/Brand", derived live from each
 * product's own `categoryId`/`brandId` (set in `ProductForm`). Deliberately
 * separate from `AdminCategory.products`/`AdminBrand.products` (the
 * curated "which products to feature" picker those forms already have) —
 * the two are different relationships: one is a product's own classification,
 * the other is merchandising curation. Lives here (not in
 * `adminCategories.ts`/`adminBrands.ts`) to avoid a circular import, since
 * `adminProductStore.tsx` already imports *from* those two files for its own
 * baseline backfill.
 */
export function productsInCategory(categoryId: string, products: AdminProduct[]): AdminProduct[] {
  return products.filter((p) => p.categoryId === categoryId);
}

export function productsInBrand(brandId: string, products: AdminProduct[]): AdminProduct[] {
  return products.filter((p) => p.brandId === brandId);
}
