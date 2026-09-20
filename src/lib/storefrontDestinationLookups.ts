import { useLandingPages } from "./promotionPages";
import { useCategoryContent } from "./categoryContent";
import { useCollectionContent } from "./collectionContent";
import { useProductCatalog } from "./productCatalog";

/**
 * Global Frontend Navigation Architecture — the storefront-side composition
 * of `resolveHomepageDestinationHref`'s `lookups` parameter, mirroring
 * `useAdminDestinationLookups()`. Every storefront component that resolves a
 * `HomepageDestination` (Hero slide CTA, Homepage sections' CTA/Promotion
 * Banner) should call this instead of hand-building the lookups object
 * inline, so this is the one place a future destination kind gets wired up
 * for the real storefront.
 */
export function useStorefrontDestinationLookups() {
  const landingPages = useLandingPages();
  const categories = useCategoryContent();
  const collections = useCollectionContent();
  const catalog = useProductCatalog();

  return {
    landingPageSlug: (id: string) => landingPages.pages().find((p) => p.id === id)?.slug,
    productSlug: (id: string) => catalog.getById(id)?.slug,
    categorySlug: (id: string) => categories.getById(id)?.slug,
    collectionSlug: (id: string) => collections.getById(id)?.id,
  };
}
