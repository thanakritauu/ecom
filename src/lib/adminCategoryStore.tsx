import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminCategory, type CategoryFormValues, type CategoryStatus, buildMockCategories, normalizeCategory } from "./adminCategories";

const STORAGE_KEY = "charmiss:admin:catalog:categories";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 1000;

function baseline(): AdminCategory[] {
  return buildMockCategories();
}

type AdminCategoryContextValue = {
  categories: Accessor<AdminCategory[]>;
  getById: (id: string) => AdminCategory | undefined;
  add: (input: CategoryFormValues) => Promise<AdminCategory>;
  update: (id: string, input: CategoryFormValues) => Promise<AdminCategory>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: CategoryStatus) => Promise<void>;
};

const AdminCategoryContext = createContext<AdminCategoryContextValue>();

/**
 * Same SSR-safe shape as `adminCollectionStore.tsx` — pure baseline on
 * server + first client render, real `localStorage` read deferred to
 * `onMount`, every write path re-normalized before it can persist a
 * malformed `AdminCategory` back out.
 */
export function AdminCategoryProvider(props: { children: JSX.Element }) {
  const [categories, setCategories] = createSignal<AdminCategory[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCategories((JSON.parse(raw) as AdminCategory[]).map(normalizeCategory));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminCategory[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminCategory[]) => AdminCategory[]) => {
    setCategories((list) => {
      const next = fn(list).map(normalizeCategory);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => categories().find((c) => c.id === id);

  const add: AdminCategoryContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: AdminCategory = { ...input, id: `category-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminCategoryContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: AdminCategory | undefined;
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

  const remove: AdminCategoryContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((c) => c.id !== id));
  };

  /**
   * CMS + Frontend Refinement §1 — the Category Table's own inline Toggle
   * (same store, same `AdminCategory[]` signal as the Edit form's Toggle, so
   * either one changing status is instantly visible from the other — no
   * separate status system). Deliberately no `simulateDelay()`/failure
   * chance like `add`/`update`: a bare Toggle should flip the instant it's
   * clicked, the same UX `adminNotificationBarStore.tsx`'s on/off Toggle
   * already established, not the multi-hundred-ms latency a save button
   * with its own loading state can absorb.
   */
  const setStatus: AdminCategoryContextValue["setStatus"] = async (id, status) => {
    mutate((list) => list.map((c) => (c.id === id ? { ...c, status, updatedAt: TODAY_LABEL } : c)));
  };

  return <AdminCategoryContext.Provider value={{ categories, getById, add, update, remove, setStatus }}>{props.children}</AdminCategoryContext.Provider>;
}

export function useAdminCategories() {
  const ctx = useContext(AdminCategoryContext);
  if (!ctx) throw new Error("useAdminCategories must be used within AdminCategoryProvider");
  return ctx;
}
