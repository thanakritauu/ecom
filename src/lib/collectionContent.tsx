import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { normalizeProductCollection, isCollectionUsable, buildMockProductCollections, type ProductCollection } from "./adminCollections";

/** Same key `adminCollectionStore.tsx` (Admin's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:content:collections";

/**
 * Falls back to the same seed baseline `adminCollectionStore.tsx` starts
 * from — critical here (unlike, say, Promotion Pages' nav) because *other*
 * admin-authored content (a Homepage "product" section) can
 * reference a seeded Collection's id before any admin has ever actually
 * opened/saved that Collection once. Without this fallback, a fresh browser
 * would resolve that reference to nothing even though the Collection
 * genuinely "exists" from Admin's point of view.
 */
function fallbackCollections(): ProductCollection[] {
  return buildMockProductCollections().map(normalizeProductCollection);
}

function readStoredCollections(): ProductCollection[] {
  if (isServer) return fallbackCollections();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackCollections();
    return (JSON.parse(raw) as ProductCollection[]).map(normalizeProductCollection);
  } catch {
    return fallbackCollections();
  }
}

type CollectionContentContextValue = {
  ready: Accessor<boolean>;
  collections: Accessor<ProductCollection[]>;
  getById: (id: string) => ProductCollection | undefined;
  /** §10.5/§10.6 — a Homepage "product" section with `productSource: "collection"` resolves its product list from here (`isCollectionUsable` gates on `status === "active"`), never a copied-in product id array. */
  getUsableById: (id: string) => ProductCollection | undefined;
};

const CollectionContentContext = createContext<CollectionContentContextValue>();

/** §10.6 — the storefront's one read path into the same Product Collection data Admin manages. */
export function CollectionContentProvider(props: { children: JSX.Element }) {
  const [collections, setCollections] = createSignal<ProductCollection[]>(fallbackCollections());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setCollections(readStoredCollections());
    setReady(true);
  });

  const getById = (id: string) => collections().find((c) => c.id === id);
  const getUsableById = (id: string) => {
    const c = getById(id);
    return c && isCollectionUsable(c) ? c : undefined;
  };

  return <CollectionContentContext.Provider value={{ ready, collections, getById, getUsableById }}>{props.children}</CollectionContentContext.Provider>;
}

export function useCollectionContent() {
  const ctx = useContext(CollectionContentContext);
  if (!ctx) throw new Error("useCollectionContent must be used within CollectionContentProvider");
  return ctx;
}
