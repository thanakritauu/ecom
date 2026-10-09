import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type NavigationItem,
  type NavigationItemFormValues,
  buildMockNavigationItems,
  normalizeNavigationItem,
  NAV_LATE_SEEDS_KEY,
  withLateNavigationSeeds,
} from "./adminNavigation";

const STORAGE_KEY = "charmiss:admin:navigation:v7"; // v7 = menu artwork back as image icons (v6 = Figma 132:2352 menu + categories)
const TODAY_LABEL = "20 ก.ย. 2569";
let nextId = 1000;

type AdminNavigationContextValue = {
  items: Accessor<NavigationItem[]>;
  getById: (id: string) => NavigationItem | undefined;
  add: (input: NavigationItemFormValues) => Promise<NavigationItem>;
  update: (id: string, input: NavigationItemFormValues) => Promise<NavigationItem>;
  remove: (id: string) => Promise<void>;
  toggleVisible: (id: string) => Promise<void>;
  /** Swaps `order` with the item immediately before/after it (within the same `parentId` group) — §11's "use `order`, not array index" rule, exposed as the move affordance the list UI's Up/Down buttons call. */
  move: (id: string, direction: "up" | "down") => Promise<void>;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue>();

/** Same SSR-safe shape every other Admin store here uses (`adminCategoryStore.tsx`, `adminContentStore.tsx`, ...) — pure baseline on server + first client render, real `localStorage` read deferred to `onMount`. */
export function AdminNavigationProvider(props: { children: JSX.Element }) {
  const [items, setItems] = createSignal<NavigationItem[]>(buildMockNavigationItems());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let list = (JSON.parse(raw) as NavigationItem[]).map(normalizeNavigationItem);
        if (!localStorage.getItem(NAV_LATE_SEEDS_KEY)) {
          list = withLateNavigationSeeds(list);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
        setItems(list);
      }
      localStorage.setItem(NAV_LATE_SEEDS_KEY, "1");
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: NavigationItem[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: NavigationItem[]) => NavigationItem[]) => {
    setItems((list) => {
      const next = fn(list).map(normalizeNavigationItem);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
  const getById = (id: string) => items().find((i) => i.id === id);

  const add: AdminNavigationContextValue["add"] = async (input) => {
    await simulateDelay();
    const maxOrder = items().reduce((max, i) => Math.max(max, i.order), 0);
    const created: NavigationItem = {
      ...input,
      id: `nav-${nextId++}`,
      order: input.order || maxOrder + 1,
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    };
    mutate((list) => [...list, created]);
    return created;
  };

  const update: AdminNavigationContextValue["update"] = async (id, input) => {
    await simulateDelay();
    let updated: NavigationItem | undefined;
    mutate((list) =>
      list.map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const remove: AdminNavigationContextValue["remove"] = async (id) => {
    await simulateDelay();
    // Deleting a parent leaves its children as top-level items (never silently
    // deletes a whole subtree the admin didn't ask to remove).
    mutate((list) => list.filter((i) => i.id !== id).map((i) => (i.parentId === id ? { ...i, parentId: undefined } : i)));
  };

  const toggleVisible: AdminNavigationContextValue["toggleVisible"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.map((i) => (i.id === id ? { ...i, visible: !i.visible, updatedAt: TODAY_LABEL } : i)));
  };

  const move: AdminNavigationContextValue["move"] = async (id, direction) => {
    const current = getById(id);
    if (!current) return;
    const siblings = items()
      .filter((i) => i.parentId === current.parentId)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((i) => i.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;
    const other = siblings[swapIndex];
    await simulateDelay();
    mutate((list) =>
      list.map((i) => {
        if (i.id === current.id) return { ...i, order: other.order, updatedAt: TODAY_LABEL };
        if (i.id === other.id) return { ...i, order: current.order, updatedAt: TODAY_LABEL };
        return i;
      }),
    );
  };

  return (
    <AdminNavigationContext.Provider value={{ items, getById, add, update, remove, toggleVisible, move }}>
      {props.children}
    </AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation() {
  const ctx = useContext(AdminNavigationContext);
  if (!ctx) throw new Error("useAdminNavigation must be used within AdminNavigationProvider");
  return ctx;
}
