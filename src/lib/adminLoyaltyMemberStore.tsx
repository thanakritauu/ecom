import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminLoyaltyMember, buildMockLoyaltyMembers, normalizeLoyaltyMember } from "./adminLoyaltyMembers";

const STORAGE_KEY = "charmiss:admin:loyalty:members";

function baseline(): AdminLoyaltyMember[] {
  return buildMockLoyaltyMembers();
}

function nowSyncLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `18 ก.ย. 2569 ${hh}:${mm} น.`;
}

type AdminLoyaltyMemberContextValue = {
  members: Accessor<AdminLoyaltyMember[]>;
  getById: (id: string) => AdminLoyaltyMember | undefined;
  lastSyncedAt: Accessor<string>;
  syncSelected: (ids: string[]) => Promise<void>;
  syncAll: () => Promise<void>;
};

const AdminLoyaltyMemberContext = createContext<AdminLoyaltyMemberContextValue>();

/**
 * Loyalty (Phase 08.2) — "สมาชิก" as a Cordy CRM Integration view. Same
 * read-only, sync-only shape as `adminLoyaltyStore.tsx` (Phase 08.1's Coin
 * Rules): no `add`/`update`/`remove` anywhere — Membership is Cordy's, this
 * store only mirrors the last synced snapshot and lets the admin re-trigger
 * a mock sync.
 */
export function AdminLoyaltyMemberProvider(props: { children: JSX.Element }) {
  const [members, setMembers] = createSignal<AdminLoyaltyMember[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMembers((JSON.parse(raw) as AdminLoyaltyMember[]).map(normalizeLoyaltyMember));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminLoyaltyMember[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminLoyaltyMember[]) => AdminLoyaltyMember[]) => {
    setMembers((list) => {
      const next = fn(list).map(normalizeLoyaltyMember);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => members().find((m) => m.id === id);

  const lastSyncedAt = createMemo(() => {
    const list = members();
    if (list.length === 0) return "-";
    return list.reduce((latest, m) => (m.syncedAt > latest ? m.syncedAt : latest), list[0].syncedAt);
  });

  const syncSelected: AdminLoyaltyMemberContextValue["syncSelected"] = async (ids) => {
    await simulateDelay();
    const label = nowSyncLabel();
    const idSet = new Set(ids);
    mutate((list) => list.map((m) => (idSet.has(m.id) ? { ...m, syncedAt: label } : m)));
  };

  const syncAll: AdminLoyaltyMemberContextValue["syncAll"] = async () => {
    await simulateDelay();
    const label = nowSyncLabel();
    mutate((list) => list.map((m) => ({ ...m, syncedAt: label })));
  };

  return (
    <AdminLoyaltyMemberContext.Provider value={{ members, getById, lastSyncedAt, syncSelected, syncAll }}>
      {props.children}
    </AdminLoyaltyMemberContext.Provider>
  );
}

export function useAdminLoyaltyMembers() {
  const ctx = useContext(AdminLoyaltyMemberContext);
  if (!ctx) throw new Error("useAdminLoyaltyMembers must be used within AdminLoyaltyMemberProvider");
  return ctx;
}
