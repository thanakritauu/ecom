import { createContext, createSignal, onCleanup, onMount, useContext, type Accessor, type JSX } from "solid-js";
import {
  buildAdminProductBaseline,
  isProductOnSale,
  lowStockThresholdOf,
  normalizeAdminProduct,
  PRODUCTS_CHANGED_EVENT,
  PRODUCTS_STORAGE_KEY,
  readPersistedAdminProducts,
  type AdminProduct,
} from "./adminProductStore";
import type { Product } from "./types";
import { isFlashSale } from "./products";
import { HIDDEN_REVIEWS_CHANGED_EVENT, HIDDEN_REVIEWS_STORAGE_KEY, readHiddenReviewKeys, reviewKey } from "./adminProductReviews";

/** Stock at or below this shows "เหลือ X ชิ้นสุดท้าย" in the cart: the product's own Admin setting (default 5). */
export const storefrontLowStockThreshold = (product: Product) => lowStockThresholdOf(product as Partial<AdminProduct>);

/**
 * Architecture Cleanup & Source of Truth — the storefront's one read path
 * into the exact same Product data Admin manages, same "Admin store +
 * read-only mirror" pattern already established for Category
 * (`categoryContent.tsx`), Collection (`collectionContent.tsx`), and
 * Landing Page (`promotionPages.tsx`) — not a
 * new architecture, the one missing instance of an existing one.
 * `adminProductStore.tsx` (`useAdminProducts()`) stays the Admin-only write
 * side; this file never writes to `localStorage`, only reads the same key.
 *
 * `AdminProduct` is a strict superset of the customer-facing `Product`
 * (`type AdminProduct = Product & {...admin-only fields}`, see
 * `adminProductStore.tsx`), so no transformation/stripping step is needed to
 * hand this data to a storefront component that only reads `Product` fields
 * — the "derived read model" the target architecture asks for is this
 * mirror itself (same data, read-only, always in sync via the same
 * `localStorage` key), not a second reshaped dataset.
 */
function fallbackProducts(): AdminProduct[] {
  return buildAdminProductBaseline().map(normalizeAdminProduct);
}

/**
 * Only products Admin has on sale ("เปิดขาย") reach the storefront; drafts and
 * switched-off products are hidden everywhere. Reviews Admin hid (รีวิว >
 * รีวิวสินค้า) are dropped here too, so the PDP and the Option Modal never
 * show them.
 */
function readStoredProducts(): AdminProduct[] {
  const hidden = readHiddenReviewKeys();
  return (readPersistedAdminProducts() ?? fallbackProducts())
    .filter(isProductOnSale)
    .map((p) => (hidden.size > 0 && p.reviews?.length ? { ...p, reviews: p.reviews.filter((r) => !hidden.has(reviewKey(p.id, r.id))) } : p));
}

/**
 * Flash sale only while now is inside the product's window: before a one-off
 * sale starts (or after it ends) the product carries no flash-sale fields, so
 * no rail, ribbon or countdown shows it anywhere.
 */
function withLiveFlashSale(list: AdminProduct[], now = Date.now()): AdminProduct[] {
  return list.map((p) => (p.flashSaleEndsAt !== undefined && !isFlashSale(p, now) ? { ...p, flashSaleEndsAt: undefined, flashSaleStartsAt: undefined } : p));
}

/** The next moment a one-off flash sale starts or ends (to refresh right then), if any within a day. */
function nextFlashSaleBoundary(list: AdminProduct[], now = Date.now()): number | undefined {
  const times = list
    .filter((p) => p.flashSaleEndsAt !== undefined && !p.flashSaleDaily)
    .flatMap((p) => [p.flashSaleStartsAt, p.flashSaleEndsAt])
    .filter((t): t is number => typeof t === "number" && t > now && t - now <= 24 * 60 * 60 * 1000);
  return times.length > 0 ? Math.min(...times) : undefined;
}

type ProductCatalogContextValue = {
  /** `false` until the real (client-only) `localStorage` read has happened — SSR and the client's first paint both render the same baseline (see `fallbackProducts`), so there's no hydration mismatch. */
  ready: Accessor<boolean>;
  products: Accessor<AdminProduct[]>;
  getById: (id: string) => AdminProduct | undefined;
  getBySlug: (slug: string) => AdminProduct | undefined;
  /** Products whose own `categoryId` classifies them under this Category — derived live, never a second stored list. */
  getByCategory: (categoryId: string) => AdminProduct[];
  /** Resolves an ordered list of product ids (e.g. a Collection's own `productId[]`) against the live catalog — the one place "reference → real Product" resolution happens, reused by Homepage/Landing Page Product sections alike. */
  getByIds: (ids: string[]) => AdminProduct[];
};

const ProductCatalogContext = createContext<ProductCatalogContextValue>();

export function ProductCatalogProvider(props: { children: JSX.Element }) {
  // The baseline's flash sale is the daily round (always live), so SSR and the first client paint still agree.
  const [products, setProducts] = createSignal<AdminProduct[]>(fallbackProducts().filter(isProductOnSale));
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const stored = readStoredProducts();
      setProducts(withLiveFlashSale(stored));
      clearTimeout(boundaryTimer);
      const next = nextFlashSaleBoundary(stored);
      if (next !== undefined) boundaryTimer = setTimeout(refresh, next - Date.now() + 500);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(PRODUCTS_STORAGE_KEY) || e.key === HIDDEN_REVIEWS_STORAGE_KEY) refresh();
    };
    refresh();
    setReady(true);
    window.addEventListener("storage", onStorage);
    window.addEventListener(PRODUCTS_CHANGED_EVENT, refresh);
    window.addEventListener(HIDDEN_REVIEWS_CHANGED_EVENT, refresh);
    onCleanup(() => {
      clearTimeout(boundaryTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PRODUCTS_CHANGED_EVENT, refresh);
      window.removeEventListener(HIDDEN_REVIEWS_CHANGED_EVENT, refresh);
    });
  });

  const getById = (id: string) => products().find((p) => p.id === id);
  const getBySlug = (slug: string) => products().find((p) => p.slug === slug);
  const getByCategory = (categoryId: string) => products().filter((p) => p.categoryId === categoryId);
  const getByIds = (ids: string[]) => ids.map(getById).filter((p): p is AdminProduct => p !== undefined);

  return (
    <ProductCatalogContext.Provider value={{ ready, products, getById, getBySlug, getByCategory, getByIds }}>
      {props.children}
    </ProductCatalogContext.Provider>
  );
}

export function useProductCatalog() {
  const ctx = useContext(ProductCatalogContext);
  if (!ctx) throw new Error("useProductCatalog must be used within ProductCatalogProvider");
  return ctx;
}
