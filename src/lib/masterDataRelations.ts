import type { AdminProduct } from "./adminProductStore";
import type { PromotionPage } from "./adminContent";
import type { ProductCollection } from "./adminCollections";

/**
 * Admin Master Data Foundation — the one place that answers "which products
 * classify themselves under this Category", derived live from each
 * product's own `categoryId` (set in `ProductForm`). Deliberately separate
 * from `AdminCategory.products` (the curated "which products to feature"
 * picker that form already has) — the two are different relationships: one
 * is a product's own classification, the other is merchandising curation.
 * Lives here (not in `adminCategories.ts`) to avoid a circular import, since
 * `adminProductStore.tsx` already imports *from* that file for its own
 * baseline backfill.
 */
export function productsInCategory(categoryId: string, products: AdminProduct[]): AdminProduct[] {
  return products.filter((p) => p.categoryId === categoryId);
}

/** Every Collection that manually curates this Product — checked before deleting a Product (§21/§46) so a curated Collection never silently shrinks. */
export function collectionsContainingProduct(productId: string, collections: ProductCollection[]): ProductCollection[] {
  return collections.filter((c) => c.products.some((ref) => ref.productId === productId));
}

/**
 * Product / Category / Collection Source-of-Truth Cleanup §42/§43/§45/§46
 * — Promotion Page (incl. Homepage) Section references, for the three entity
 * kinds a Section can point at: a Product Section's own source
 * (`productSource: "category" | "collection"`), or any section's CTA
 * destination (`HomepageDestination`, which can target a Category/
 * Collection/Product directly as a link — a separate relationship from the
 * Product Section source above). Reused by the Category/Collection/Product
 * delete-dependency guards so none of the three can be deleted out from
 * under a Promotion Page/Homepage Section.
 */
export type PromotionPageSectionReference = { pageId: string; pageName: string; isHomepage: boolean; sectionName: string };

function scanPromotionPageSections(
  pages: PromotionPage[],
  predicate: (section: PromotionPage["sections"][number]) => boolean,
): PromotionPageSectionReference[] {
  const hits: PromotionPageSectionReference[] = [];
  for (const page of pages) {
    for (const section of page.sections) {
      if (predicate(section)) hits.push({ pageId: page.id, pageName: page.name, isHomepage: page.isHomepage, sectionName: section.name });
    }
  }
  return hits;
}

export function findCategoryReferencesInPromotionPages(categoryId: string, pages: PromotionPage[]): PromotionPageSectionReference[] {
  return scanPromotionPageSections(
    pages,
    (s) =>
      (s.type === "product" && s.productSource === "category" && s.categoryId === categoryId) ||
      (s.cta.destination.type === "category" && s.cta.destination.categoryId === categoryId),
  );
}

export function findCollectionReferencesInPromotionPages(collectionId: string, pages: PromotionPage[]): PromotionPageSectionReference[] {
  return scanPromotionPageSections(
    pages,
    (s) =>
      (s.type === "product" && s.productSource === "collection" && s.collectionId === collectionId) ||
      (s.cta.destination.type === "collection" && s.cta.destination.collectionId === collectionId),
  );
}

/** Also checks the legacy flat `PromotionPage.products[]` (pages built before the Section Builder existed) — deleting a Product referenced there would silently shrink that page's product grid. */
export function findProductReferencesInPromotionPages(productId: string, pages: PromotionPage[]): PromotionPageSectionReference[] {
  const sectionHits = scanPromotionPageSections(
    pages,
    (s) => (s.cta.destination.type === "product" && s.cta.destination.productId === productId) || s.products.some((ref) => ref.productId === productId),
  );
  const flatHits: PromotionPageSectionReference[] = pages
    .filter((p) => p.products.some((ref) => ref.productId === productId))
    .map((p) => ({ pageId: p.id, pageName: p.name, isHomepage: p.isHomepage, sectionName: "สินค้าหลักของหน้า" }));
  return [...sectionHits, ...flatHits];
}
