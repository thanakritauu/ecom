import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminInventoryStock, buildMockInventoryStock, getAvailableStock, getInventoryStockStatus, normalizeInventoryStock } from "./adminInventoryStock";
import { useAdminProducts } from "./adminProductStore";

const STORAGE_KEY = "charmiss:admin:inventory:stock";
/**
 * Seed version of what's stored under `STORAGE_KEY` (same idea as
 * adminProductStore's). v2: the low-stock line moved 10 → 5 to match the
 * storefront — stored statuses were computed with the old line, so they're
 * re-derived from Available on load.
 */
const SEED_VERSION_KEY = "charmiss:admin:inventory:stock:seed-version";
const SEED_VERSION = 2;

function nowSyncLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `18 ก.ย. 2569 ${hh}:${mm} น.`;
}

type AdminInventoryStockContextValue = {
  stocks: Accessor<AdminInventoryStock[]>;
  getById: (id: string) => AdminInventoryStock | undefined;
  getByProductId: (productId: string) => AdminInventoryStock | undefined;
  lastSyncedAt: Accessor<string>;
  syncSelected: (ids: string[]) => Promise<void>;
  syncAll: () => Promise<void>;
};

const AdminInventoryStockContext = createContext<AdminInventoryStockContextValue>();

/**
 * Inventory (Phase 06) — read-only, sync-only store, same shape as Loyalty's
 * Charmiss Club CRM stores: no `add`/`update`/`remove`/adjust-quantity anywhere.
 * Seeded once from the live Product catalog (`buildMockInventoryStock`'s own
 * doc comment explains why), then fully independent of it.
 */
export function AdminInventoryStockProvider(props: { children: JSX.Element }) {
  const productStore = useAdminProducts();
  const [stocks, setStocks] = createSignal<AdminInventoryStock[]>(buildMockInventoryStock(productStore.products()));

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = (JSON.parse(raw) as AdminInventoryStock[]).map(normalizeInventoryStock);
      const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 1);
      if (version < SEED_VERSION) {
        const migrated = stored.map((s) => ({ ...s, status: getInventoryStockStatus(getAvailableStock(s)) }));
        setStocks(migrated);
        persist(migrated);
      } else {
        setStocks(stored);
      }
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminInventoryStock[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    } catch {}
  };

  const mutate = (fn: (list: AdminInventoryStock[]) => AdminInventoryStock[]) => {
    setStocks((list) => {
      const next = fn(list).map(normalizeInventoryStock);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => stocks().find((s) => s.id === id);
  const getByProductId = (productId: string) => stocks().find((s) => s.productId === productId);

  const lastSyncedAt = createMemo(() => {
    const list = stocks();
    if (list.length === 0) return "-";
    return list.reduce((latest, s) => (s.syncedAt > latest ? s.syncedAt : latest), list[0].syncedAt);
  });

  const syncSelected: AdminInventoryStockContextValue["syncSelected"] = async (ids) => {
    await simulateDelay();
    const label = nowSyncLabel();
    const idSet = new Set(ids);
    mutate((list) => list.map((s) => (idSet.has(s.id) ? { ...s, syncedAt: label } : s)));
  };

  const syncAll: AdminInventoryStockContextValue["syncAll"] = async () => {
    await simulateDelay();
    const label = nowSyncLabel();
    mutate((list) => list.map((s) => ({ ...s, syncedAt: label })));
  };

  return (
    <AdminInventoryStockContext.Provider value={{ stocks, getById, getByProductId, lastSyncedAt, syncSelected, syncAll }}>
      {props.children}
    </AdminInventoryStockContext.Provider>
  );
}

export function useAdminInventoryStock() {
  const ctx = useContext(AdminInventoryStockContext);
  if (!ctx) throw new Error("useAdminInventoryStock must be used within AdminInventoryStockProvider");
  return ctx;
}
