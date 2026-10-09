import { useAdminContent } from "./adminContentStore";
import { useAdminProducts } from "./adminProductStore";
import { useAdminCategories } from "./adminCategoryStore";
import { useAdminCollections } from "./adminCollectionStore";

/**
 * Global Frontend Navigation Architecture — the Admin-side composition of
 * `resolveHomepageDestinationHref`'s `lookups` parameter. Every Admin
 * preview/detail page that resolves a `HomepageDestination` (Banner Quick
 * View, Promotion Page detail pages)
 * should call this instead of hand-building `{ landingPageSlug, productSlug,
 * ... }` inline — one composition, reused everywhere, so adding a future
 * destination kind only ever means editing this one
 * function plus the resolver switch, never each call site individually.
 * `contentStore` (`useAdminContent()`) is the same `PromotionPage`
 * implementation `LandingPage` is aliased to — see `adminContent.ts`.
 */
export function useAdminDestinationLookups() {
  const contentStore = useAdminContent();
  const productStore = useAdminProducts();
  const categoryStore = useAdminCategories();
  const collectionStore = useAdminCollections();

  return {
    landingPageSlug: (id: string) => contentStore.getById(id)?.slug,
    productSlug: (id: string) => productStore.getById(id)?.slug,
    categorySlug: (id: string) => categoryStore.getById(id)?.slug,
    collectionSlug: (id: string) => collectionStore.getById(id)?.id,
  };
}
