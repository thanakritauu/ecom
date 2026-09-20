import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type Banner, type BannerStatus, type BannerFormValues, buildMockBanners, normalizeBanner } from "./adminBanners";

const STORAGE_KEY = "charmiss:admin:content:banners";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 1000;

type AdminBannerContextValue = {
  banners: Accessor<Banner[]>;
  getById: (id: string) => Banner | undefined;
  add: (input: BannerFormValues) => Promise<Banner>;
  update: (id: string, input: BannerFormValues) => Promise<Banner>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: BannerStatus) => Promise<void>;
};

const AdminBannerContext = createContext<AdminBannerContextValue>();

/**
 * Same SSR-safe shape as `adminContentStore.tsx` (Promotion Pages) — pure
 * baseline on server + first client render, real `localStorage` read
 * deferred to `onMount`, every write path re-normalized before it can
 * persist a malformed `Banner` back out. A normal single-array CRUD list
 * (no draft/published dual-state — Banners don't need that CMS workflow).
 */
export function AdminBannerProvider(props: { children: JSX.Element }) {
  const [banners, setBanners] = createSignal<Banner[]>(buildMockBanners());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBanners((JSON.parse(raw) as Banner[]).map(normalizeBanner));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: Banner[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: Banner[]) => Banner[]) => {
    setBanners((list) => {
      const next = fn(list).map(normalizeBanner);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => banners().find((b) => b.id === id);

  const add: AdminBannerContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: Banner = { ...input, id: `banner-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminBannerContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: Banner | undefined;
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

  const remove: AdminBannerContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((b) => b.id !== id));
  };

  const setStatus: AdminBannerContextValue["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((b) => (b.id === id ? { ...b, status, updatedAt: TODAY_LABEL } : b)));
  };

  return <AdminBannerContext.Provider value={{ banners, getById, add, update, remove, setStatus }}>{props.children}</AdminBannerContext.Provider>;
}

export function useAdminBanners() {
  const ctx = useContext(AdminBannerContext);
  if (!ctx) throw new Error("useAdminBanners must be used within AdminBannerProvider");
  return ctx;
}
