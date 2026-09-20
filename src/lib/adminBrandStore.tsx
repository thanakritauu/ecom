import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminBrand, type BrandFormValues, buildMockBrands, normalizeBrand } from "./adminBrands";

const STORAGE_KEY = "charmiss:admin:catalog:brands";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 1000;

function baseline(): AdminBrand[] {
  return buildMockBrands();
}

type AdminBrandContextValue = {
  brands: Accessor<AdminBrand[]>;
  getById: (id: string) => AdminBrand | undefined;
  add: (input: BrandFormValues) => Promise<AdminBrand>;
  update: (id: string, input: BrandFormValues) => Promise<AdminBrand>;
  remove: (id: string) => Promise<void>;
};

const AdminBrandContext = createContext<AdminBrandContextValue>();

/** Same SSR-safe shape as `adminCategoryStore.tsx`. */
export function AdminBrandProvider(props: { children: JSX.Element }) {
  const [brands, setBrands] = createSignal<AdminBrand[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBrands((JSON.parse(raw) as AdminBrand[]).map(normalizeBrand));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminBrand[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminBrand[]) => AdminBrand[]) => {
    setBrands((list) => {
      const next = fn(list).map(normalizeBrand);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => brands().find((b) => b.id === id);

  const add: AdminBrandContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: AdminBrand = { ...input, id: `brand-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminBrandContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: AdminBrand | undefined;
    mutate((list) =>
      list.map((b) => {
        if (b.id !== id) return b;
        updated = { ...b, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const remove: AdminBrandContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((b) => b.id !== id));
  };

  return <AdminBrandContext.Provider value={{ brands, getById, add, update, remove }}>{props.children}</AdminBrandContext.Provider>;
}

export function useAdminBrands() {
  const ctx = useContext(AdminBrandContext);
  if (!ctx) throw new Error("useAdminBrands must be used within AdminBrandProvider");
  return ctx;
}
