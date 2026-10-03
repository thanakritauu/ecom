import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminInventoryStock, buildMockInventoryStock, normalizeInventoryStock } from "./adminInventoryStock";
import { useAdminProducts } from "./adminProductStore";

const STORAGE_KEY = "charmiss:admin:inventory:stock";

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
 * Cordy CRM stores: no `add`/`update`/`remove`/adjust-quantity anywhere.
 * Seeded once from the live Product catalog (`buildMockInventoryStock`'s own
 * doc comment explains why), then fully independent of it.
 */
export function AdminInventoryStockProvider(props: { children: JSX.Element }) {
  const productStore = useAdminProducts();
  const [stocks, setStocks] = createSignal<AdminInventoryStock[]>(buildMockInventoryStock(productStore.products()));

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStocks((JSON.parse(raw) as AdminInventoryStock[]).map(normalizeInventoryStock));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminInventoryStock[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
