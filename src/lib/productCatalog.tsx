import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { buildAdminProductBaseline, normalizeAdminProduct, readPersistedAdminProducts, type AdminProduct } from "./adminProductStore";

/**
 * Architecture Cleanup & Source of Truth — the storefront's one read path
 * into the exact same Product data Admin manages, same "Admin store +
 * read-only mirror" pattern already established for Category
 * (`categoryContent.tsx`), Collection (`collectionContent.tsx`), Campaign
 * (`campaignContent.tsx`), and Landing Page (`promotionPages.tsx`) — not a
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

function readStoredProducts(): AdminProduct[] {
  return readPersistedAdminProducts() ?? fallbackProducts();
}

type ProductCatalogContextValue = {
  /** `false` until the real (client-only) `localStorage` read has happened — SSR and the client's first paint both render the same baseline (see `fallbackProducts`), so there's no hydration mismatch. */
  ready: Accessor<boolean>;
  products: Accessor<AdminProduct[]>;
  getById: (id: string) => AdminProduct | undefined;
  getBySlug: (slug: string) => AdminProduct | undefined;
  /** Products whose own `categoryId` classifies them under this Category — derived live, never a second stored list. */
  getByCategory: (categoryId: string) => AdminProduct[];
  /** Resolves an ordered list of product ids (e.g. a Collection's or Campaign's own `productId[]`) against the live catalog — the one place "reference → real Product" resolution happens, reused by Homepage/Landing Page Product & Campaign sections alike. */
  getByIds: (ids: string[]) => AdminProduct[];
};

const ProductCatalogContext = createContext<ProductCatalogContextValue>();

export function ProductCatalogProvider(props: { children: JSX.Element }) {
  const [products, setProducts] = createSignal<AdminProduct[]>(fallbackProducts());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setProducts(readStoredProducts());
    setReady(true);
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
