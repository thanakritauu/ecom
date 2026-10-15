import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type MarketingStatus,
  type Promotion,
  type Coupon,
  buildMockPromotions,
  buildMockCoupons,
  normalizePromotions,
  normalizeCoupons,
  MARKETING_SEED_VERSION,
} from "./adminMarketing";
import { COUPONS_STORAGE_KEY, MARKETING_CHANGED_EVENT, PROMOTIONS_STORAGE_KEY } from "./storefrontPromotions";
import { FLASH_CAMPAIGNS_STORAGE_KEY, migrateFlashCampaigns, normalizeFlashCampaigns, readStoredFlashCampaigns, type FlashSaleCampaign } from "./flashSaleCampaigns";
import { buildLegacyAdminProductBaseline, ensureFlashCampaignsFromProducts } from "./adminProductStore";

const TODAY_LABEL = "17 ก.ย. 2569";
let nextId = 1000;

type WithId = { id: string; status: MarketingStatus; createdAt: string; updatedAt: string; startDate: string; startTime: string; endDate: string; endTime: string };

/** Bangkok "now" as the stored date + time (YYYY-MM-DD, HH:mm), one minute back so the window has closed by the next minute tick. */
function bangkokNowMinusMinute(): { date: string; time: string } {
  const iso = new Date(Date.now() + 7 * 3600_000 - 60_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export type EntityCrud<T extends WithId> = {
  items: Accessor<T[]>;
  getById: (id: string) => T | undefined;
  add: (input: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T>;
  update: (id: string, input: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<T>;
  setStatus: (id: string, status: MarketingStatus) => Promise<void>;
  /** "สิ้นสุดตอนนี้": the end date-time becomes now (Bangkok), so it stops running right away. */
  endNow: (id: string) => Promise<void>;
};

/**
 * One generic CRUD factory for promotions and coupons, SSR-safe like
 * `adminProductStore` (seeds on the server and first client render, the
 * stored copy read on mount). A stored copy from an older seed version
 * drops its seed records (id number < 1000) for the new ones and keeps what
 * Admin created, passed through `normalize` so old shapes read correctly.
 * Every save tells the storefront (same tab: `MARKETING_CHANGED_EVENT`,
 * other tabs: the `storage` event) so the cart and coupons update live.
 */
const idNumber = (id: string) => Number(id.match(/-(\d+)$/)?.[1] ?? 0);

/**
 * `fromStorage`: the store reads its stored copy through this instead (e.g.
 * flash sale campaigns, which migrate from the products on first read and
 * never re-seed).
 */
function createEntityStore<T extends WithId>(
  storageKey: string,
  baseline: () => T[],
  idPrefix: string,
  normalize: (list: T[]) => T[],
  fromStorage?: () => T[] | null,
): EntityCrud<T> {
  const versionKey = `${storageKey}:seed-version`;
  const [items, setItems] = createSignal<T[]>(baseline());

  onMount(() => {
    try {
      if (fromStorage) {
        const stored = fromStorage();
        if (!stored) return;
        nextId = Math.max(nextId, ...stored.map((item) => idNumber(item.id) + 1));
        setItems(stored);
        return;
      }
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      let stored = normalize(JSON.parse(raw) as T[]);
      if (Number(localStorage.getItem(versionKey) ?? 1) < MARKETING_SEED_VERSION) {
        stored = [...stored.filter((item) => idNumber(item.id) >= 1000), ...baseline()];
        persist(stored);
      }
      // Never hand out an id a stored Admin-created record already has.
      nextId = Math.max(nextId, ...stored.map((item) => idNumber(item.id) + 1));
      setItems(stored);
    } catch {
      // storage unavailable: stays in memory for this tab.
    }
  });

  function persist(list: T[]) {
    if (isServer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
      localStorage.setItem(versionKey, String(MARKETING_SEED_VERSION));
      window.dispatchEvent(new Event(MARKETING_CHANGED_EVENT));
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

  // A copy starts switched off so it never runs on the storefront before Admin has edited it.
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

  const endNow: EntityCrud<T>["endNow"] = async (id) => {
    await simulateDelay();
    const { date, time } = bangkokNowMinusMinute();
    mutate((list) => list.map((item) => (item.id === id ? { ...item, endDate: date, endTime: time, updatedAt: TODAY_LABEL } : item)));
  };

  return { items, getById, add, update, remove, duplicate, setStatus, endNow };
}

type AdminMarketingContextValue = {
  promotions: EntityCrud<Promotion>;
  coupons: EntityCrud<Coupon>;
  /** Flash sale campaigns (`~/lib/flashSaleCampaigns`). */
  flashSales: EntityCrud<FlashSaleCampaign>;
};

const AdminMarketingContext = createContext<AdminMarketingContextValue>();

export function AdminMarketingProvider(props: { children: JSX.Element }) {
  // The first flash sale store (before it moved to products, then to campaigns) and bundles are gone; drop their old stored copies.
  onMount(() => {
    try {
      for (const key of ["charmiss:admin:marketing:flashsales", "charmiss:admin:marketing:bundles"]) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}:seed-version`);
      }
    } catch {}
  });
  const value: AdminMarketingContextValue = {
    promotions: createEntityStore(PROMOTIONS_STORAGE_KEY, buildMockPromotions, "promo", normalizePromotions),
    coupons: createEntityStore(COUPONS_STORAGE_KEY, buildMockCoupons, "coupon", normalizeCoupons),
    flashSales: createEntityStore(
      FLASH_CAMPAIGNS_STORAGE_KEY,
      () => migrateFlashCampaigns(buildLegacyAdminProductBaseline()),
      "flashsale",
      normalizeFlashCampaigns,
      () => {
        ensureFlashCampaignsFromProducts();
        return readStoredFlashCampaigns();
      },
    ),
  };
  return <AdminMarketingContext.Provider value={value}>{props.children}</AdminMarketingContext.Provider>;
}

export function useAdminMarketing() {
  const ctx = useContext(AdminMarketingContext);
  if (!ctx) throw new Error("useAdminMarketing must be used within AdminMarketingProvider");
  return ctx;
}
