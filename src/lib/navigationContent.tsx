import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { buildMockNavigationItems, normalizeNavigationItem, type NavigationItem } from "./adminNavigation";
import { buildNavigationTree, filterVisibleNavigationTree, type ResolvedNavigationItem } from "./navigationResolver";
import { useLandingPages } from "./promotionPages";
import { useCategoryContent } from "./categoryContent";
import { useCollectionContent } from "./collectionContent";
import { useProductCatalog } from "./productCatalog";

/** Same key `adminNavigationStore.tsx` (Admin's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:navigation";

/** Same "fallback to the real baseline, used as both the SSR value and the empty-storage fallback" fix already applied to every other `*Content.tsx` provider — a fresh browser that never opened Admin still sees the real seeded menu, not an empty flash. */
function fallbackItems(): NavigationItem[] {
  return buildMockNavigationItems().map(normalizeNavigationItem);
}

function readStoredItems(): NavigationItem[] {
  if (isServer) return fallbackItems();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackItems();
    return (JSON.parse(raw) as NavigationItem[]).map(normalizeNavigationItem);
  } catch {
    return fallbackItems();
  }
}

type NavigationContentContextValue = {
  ready: Accessor<boolean>;
  /** Resolved, nested, filtered to `visible && available` — this is what Header/MobileMenu render. Admin's own list reads `useAdminNavigation()` + `buildNavigationTree` directly instead, unfiltered, so it can show and manage unavailable items too. */
  visibleTree: Accessor<ResolvedNavigationItem[]>;
};

const NavigationContentContext = createContext<NavigationContentContextValue>();

/**
 * The storefront's one read path into the same Navigation data Admin
 * manages — Header.tsx/MobileMenu.tsx must consume only this, never
 * `adminNavigationStore`, `PromotionPage.navigation` (removed), or a
 * hardcoded array (§4/§14/§25/§26).
 */
export function NavigationContentProvider(props: { children: JSX.Element }) {
  const [items, setItems] = createSignal<NavigationItem[]>(fallbackItems());
  const [ready, setReady] = createSignal(false);
  const landingPages = useLandingPages();
  const categories = useCategoryContent();
  const collections = useCollectionContent();
  const catalog = useProductCatalog();

  onMount(() => {
    setItems(readStoredItems());
    setReady(true);
  });

  const visibleTree = createMemo(() => {
    const tree = buildNavigationTree(items(), {
      getPromotionPage: (id) => landingPages.pages().find((p) => p.id === id),
      getCategory: categories.getById,
      getCollection: collections.getById,
      getProduct: catalog.getById,
    });
    return filterVisibleNavigationTree(tree);
  });

  return <NavigationContentContext.Provider value={{ ready, visibleTree }}>{props.children}</NavigationContentContext.Provider>;
}

export function useNavigationContent() {
  const ctx = useContext(NavigationContentContext);
  if (!ctx) throw new Error("useNavigationContent must be used within NavigationContentProvider");
  return ctx;
}
