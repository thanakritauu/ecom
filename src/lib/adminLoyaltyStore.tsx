import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminCoinRule, buildMockCoinRules, normalizeCoinRule } from "./adminLoyaltyRules";

const STORAGE_KEY = "charmiss:admin:loyalty:coinRules";

function baseline(): AdminCoinRule[] {
  return buildMockCoinRules();
}

/** `"18 ก.ย. 2569 14:32 น."` — same Thai-date convention as every other Admin label, with a time-of-day appended since a *sync* (unlike a create/edit) plausibly happens more than once a day. */
function nowSyncLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `18 ก.ย. 2569 ${hh}:${mm} น.`;
}

type AdminLoyaltyContextValue = {
  coinRules: Accessor<AdminCoinRule[]>;
  getById: (id: string) => AdminCoinRule | undefined;
  /** The most recent `syncedAt` across every rule — never a separately-stored field that could disagree with the rules themselves. */
  lastSyncedAt: Accessor<string>;
  /** Re-syncs only the given rules — used by the list's bulk "Sync ที่เลือก" action. Mock-only: touches `syncedAt` alone, never `name`/`condition`/`coinAmount`/`status` (those are Cordy's business rule and stay read-only). */
  syncSelected: (ids: string[]) => Promise<void>;
  /** Re-syncs every rule — the Integration Status card's "Sync ข้อมูล" button. */
  syncAll: () => Promise<void>;
};

const AdminLoyaltyContext = createContext<AdminLoyaltyContextValue>();

/**
 * Loyalty (Phase 08.1) — "สะสมคอยน์" as a Cordy CRM Integration view. Cordy
 * is the Loyalty Source of Truth; this store only ever mirrors what Cordy
 * last synced (`buildMockCoinRules`'s seed, standing in for a real sync
 * payload) and lets the admin re-trigger a mock sync. There is deliberately
 * no `add`/`update`/`remove`/`setStatus` here — see `adminLoyaltyRules.ts`'s
 * doc comment for why editing a Cordy rule from Charmiss is out of scope.
 * Same SSR-safe localStorage-persisted shape as `adminBrandStore.tsx`.
 */
export function AdminLoyaltyProvider(props: { children: JSX.Element }) {
  const [coinRules, setCoinRules] = createSignal<AdminCoinRule[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCoinRules((JSON.parse(raw) as AdminCoinRule[]).map(normalizeCoinRule));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminCoinRule[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminCoinRule[]) => AdminCoinRule[]) => {
    setCoinRules((list) => {
      const next = fn(list).map(normalizeCoinRule);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => coinRules().find((r) => r.id === id);

  const lastSyncedAt = createMemo(() => {
    const list = coinRules();
    if (list.length === 0) return "-";
    return list.reduce((latest, r) => (r.syncedAt > latest ? r.syncedAt : latest), list[0].syncedAt);
  });

  const syncSelected: AdminLoyaltyContextValue["syncSelected"] = async (ids) => {
    await simulateDelay();
    const label = nowSyncLabel();
    const idSet = new Set(ids);
    mutate((list) => list.map((r) => (idSet.has(r.id) ? { ...r, syncedAt: label } : r)));
  };

  const syncAll: AdminLoyaltyContextValue["syncAll"] = async () => {
    await simulateDelay();
    const label = nowSyncLabel();
    mutate((list) => list.map((r) => ({ ...r, syncedAt: label })));
  };

  return (
    <AdminLoyaltyContext.Provider value={{ coinRules, getById, lastSyncedAt, syncSelected, syncAll }}>
      {props.children}
    </AdminLoyaltyContext.Provider>
  );
}

export function useAdminLoyalty() {
  const ctx = useContext(AdminLoyaltyContext);
  if (!ctx) throw new Error("useAdminLoyalty must be used within AdminLoyaltyProvider");
  return ctx;
}
