import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type ProductCollection,
  type ProductCollectionFormValues,
  buildMockProductCollections,
  normalizeProductCollection,
} from "./adminCollections";

const STORAGE_KEY = "charmiss:admin:content:collections";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 1000;

type AdminCollectionContextValue = {
  collections: Accessor<ProductCollection[]>;
  getById: (id: string) => ProductCollection | undefined;
  add: (input: ProductCollectionFormValues) => Promise<ProductCollection>;
  update: (id: string, input: ProductCollectionFormValues) => Promise<ProductCollection>;
  remove: (id: string) => Promise<void>;
};

const AdminCollectionContext = createContext<AdminCollectionContextValue>();

/**
 * Same SSR-safe shape as `adminContentStore.tsx` — pure baseline on server +
 * first client render, real `localStorage` read deferred to `onMount`, every
 * write path re-normalized before it can persist a malformed
 * `ProductCollection` back out. Simpler than Promotion Pages' store: status
 * is just a normal field edited through `update`, no separate `setStatus`
 * verb and no publish-validation concept.
 */
export function AdminCollectionProvider(props: { children: JSX.Element }) {
  const [collections, setCollections] = createSignal<ProductCollection[]>(buildMockProductCollections());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollections((JSON.parse(raw) as ProductCollection[]).map(normalizeProductCollection));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: ProductCollection[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: ProductCollection[]) => ProductCollection[]) => {
    setCollections((list) => {
      const next = fn(list).map(normalizeProductCollection);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => collections().find((c) => c.id === id);

  const add: AdminCollectionContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: ProductCollection = { ...input, id: `collection-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminCollectionContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: ProductCollection | undefined;
    mutate((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const remove: AdminCollectionContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((c) => c.id !== id));
  };

  return <AdminCollectionContext.Provider value={{ collections, getById, add, update, remove }}>{props.children}</AdminCollectionContext.Provider>;
}

export function useAdminCollections() {
  const ctx = useContext(AdminCollectionContext);
  if (!ctx) throw new Error("useAdminCollections must be used within AdminCollectionProvider");
  return ctx;
}
