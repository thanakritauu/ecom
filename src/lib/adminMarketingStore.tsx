import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type MarketingStatus,
  type Promotion,
  type Coupon,
  type FlashSale,
  type Bundle,
  buildMockPromotions,
  buildMockCoupons,
  buildMockFlashSales,
  buildMockBundles,
} from "./adminMarketing";

const TODAY_LABEL = "17 ก.ย. 2569";
let nextId = 1000;

type WithId = { id: string; status: MarketingStatus; createdAt: string; updatedAt: string };

export type EntityCrud<T extends WithId> = {
  items: Accessor<T[]>;
  getById: (id: string) => T | undefined;
  add: (input: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T>;
  update: (id: string, input: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<T>;
  setStatus: (id: string, status: MarketingStatus) => Promise<void>;
};

/**
 * One generic CRUD factory reused for all four Marketing entities instead of
 * writing the same add/update/delete/duplicate/setStatus + localStorage
 * plumbing four times — the exact `adminProductStore.tsx`/`adminOrderStore.tsx`
 * SSR-safe pattern (pure baseline on server + first client render, real
 * `localStorage` read deferred to `onMount`), just parameterized by entity
 * prefix/baseline/storage key. Called once per entity inside the Provider
 * below, so each call still creates its own independent signal.
 */
/**
 * Seed-data version of what's persisted under each entity's storage key —
 * same idea as `adminProductStore`'s `SEED_VERSION`. v2: seeds synced to the
 * storefront (฿590 gift promo + ฿990 free shipping, the SAVE100/SAVE50/SAVE20
 * coupons with placement flags, the flash-1…12 rail at storefront prices,
 * re-priced bundles) and stable position-based seed ids. A stored copy from
 * an older version drops its seed records (id number < 1000) for the new
 * ones and keeps everything Admin created itself. v3: the three storefront
 * coupons' real expiry dates, all shown on Home + Checkout.
 */
const SEED_VERSION = 3;

const idNumber = (id: string) => Number(id.match(/-(\d+)$/)?.[1] ?? 0);

function createEntityStore<T extends WithId>(storageKey: string, baseline: () => T[], idPrefix: string): EntityCrud<T> {
  const versionKey = `${storageKey}:seed-version`;
  const [items, setItems] = createSignal<T[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      let stored = JSON.parse(raw) as T[];
      if (Number(localStorage.getItem(versionKey) ?? 1) < SEED_VERSION) {
        stored = [...stored.filter((item) => idNumber(item.id) >= 1000), ...baseline()];
        persist(stored);
      }
      // Never hand out an id a stored Admin-created record already has.
      nextId = Math.max(nextId, ...stored.map((item) => idNumber(item.id) + 1));
      setItems(stored);
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  function persist(list: T[]) {
    if (isServer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
      localStorage.setItem(versionKey, String(SEED_VERSION));
    } catch {}
  }

  const mutate = (fn: (list: T[]) => T[]) => {
    setItems((list) => {
      const next = fn(list);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => items().find((i) => i.id === id);

  const add: EntityCrud<T>["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created = { ...input, id: `${idPrefix}-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL } as T;
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: EntityCrud<T>["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: T | undefined;
    mutate((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const remove: EntityCrud<T>["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((item) => item.id !== id));
  };

  const duplicate: EntityCrud<T>["duplicate"] = async (id) => {
    await simulateDelay();
    const source = getById(id);
    if (!source) throw new Error("NOT_FOUND");
    const copy: T = { ...source, id: `${idPrefix}-${nextId++}`, status: "draft", createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    if ("name" in copy) (copy as unknown as { name: string }).name = `${(source as unknown as { name: string }).name} (สำเนา)`;
    if ("code" in copy) (copy as unknown as { code: string }).code = `${(source as unknown as { code: string }).code}-COPY`;
    mutate((list) => [copy, ...list]);
    return copy;
  };

  const setStatus: EntityCrud<T>["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((item) => (item.id === id ? { ...item, status, updatedAt: TODAY_LABEL } : item)));
  };

  return { items, getById, add, update, remove, duplicate, setStatus };
}

type AdminMarketingContextValue = {
  promotions: EntityCrud<Promotion>;
  coupons: EntityCrud<Coupon>;
  flashSales: EntityCrud<FlashSale>;
  bundles: EntityCrud<Bundle>;
};

const AdminMarketingContext = createContext<AdminMarketingContextValue>();

export function AdminMarketingProvider(props: { children: JSX.Element }) {
  const value: AdminMarketingContextValue = {
    promotions: createEntityStore("charmiss:admin:marketing:promotions", buildMockPromotions, "promo"),
    coupons: createEntityStore("charmiss:admin:marketing:coupons", buildMockCoupons, "coupon"),
    flashSales: createEntityStore("charmiss:admin:marketing:flashsales", buildMockFlashSales, "flash"),
    bundles: createEntityStore("charmiss:admin:marketing:bundles", buildMockBundles, "bundle"),
  };
  return <AdminMarketingContext.Provider value={value}>{props.children}</AdminMarketingContext.Provider>;
}

export function useAdminMarketing() {
  const ctx = useContext(AdminMarketingContext);
  if (!ctx) throw new Error("useAdminMarketing must be used within AdminMarketingProvider");
  return ctx;
}
