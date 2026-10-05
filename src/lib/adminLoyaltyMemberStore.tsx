import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { Customer } from "./adminCustomers";
import { useAdminCustomers } from "./adminCustomerStore";
import { type AdminLoyaltyMember, buildMockLoyaltyMembers, findMemberCustomer, memberFromCustomer, normalizeLoyaltyMember } from "./adminLoyaltyMembers";

const STORAGE_KEY = "charmiss:admin:loyalty:members";
/** v2 = storefront tiers, CRM-000xxx ids, CRM-000182/245, ได้รับ/รอดำเนินการ/ใช้ไป history. v3 = histories built from the seed orders with tier multipliers + CRM carry-over. The list is a sync-only mirror (only `syncedAt` is ever written), so an older copy is simply replaced by today's seeds. */
const SEED_VERSION_KEY = "charmiss:admin:loyalty:members:seed-version";
const SEED_VERSION = 3;

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
  /** Synced CRM members plus a derived row for every Customer without one yet (see `memberFromCustomer`). */
  members: Accessor<AdminLoyaltyMember[]>;
  customerOf: (m: AdminLoyaltyMember) => Customer | undefined;
  getById: (id: string) => AdminLoyaltyMember | undefined;
  lastSyncedAt: Accessor<string>;
  syncSelected: (ids: string[]) => Promise<void>;
  syncAll: () => Promise<void>;
};

const AdminLoyaltyMemberContext = createContext<AdminLoyaltyMemberContextValue>();

/**
 * Loyalty (Phase 08.2) — "สมาชิก" as a Charmiss Club CRM Integration view. Same
 * read-only, sync-only shape as `adminLoyaltyStore.tsx` (Phase 08.1's Coin
 * Rules): no `add`/`update`/`remove` anywhere — Membership is the CRM's, this
 * store only mirrors the last synced snapshot and lets the admin re-trigger
 * a mock sync.
 */
export function AdminLoyaltyMemberProvider(props: { children: JSX.Element }) {
  const customerStore = useAdminCustomers();
  const [synced, setMembers] = createSignal<AdminLoyaltyMember[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 1);
      if (raw && version >= SEED_VERSION) setMembers((JSON.parse(raw) as AdminLoyaltyMember[]).map(normalizeLoyaltyMember));
      else if (raw) localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
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
  const customerOf = (m: AdminLoyaltyMember) => findMemberCustomer(m, customerStore.customers());
  const members = createMemo(() => {
    const list = synced();
    const customers = customerStore.customers();
    const linked = new Set(list.map((m) => findMemberCustomer(m, customers)?.id).filter(Boolean));
    return [...list, ...customers.filter((c) => !linked.has(c.id)).map(memberFromCustomer)];
  });
  const getById = (id: string) => members().find((m) => m.id === id);

  const lastSyncedAt = createMemo(() => {
    const list = synced();
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
    <AdminLoyaltyMemberContext.Provider value={{ members, customerOf, getById, lastSyncedAt, syncSelected, syncAll }}>
      {props.children}
    </AdminLoyaltyMemberContext.Provider>
  );
}

export function useAdminLoyaltyMembers() {
  const ctx = useContext(AdminLoyaltyMemberContext);
  if (!ctx) throw new Error("useAdminLoyaltyMembers must be used within AdminLoyaltyMemberProvider");
  return ctx;
}
