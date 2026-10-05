import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminReward, type RewardPresentationValues, buildMockRewards, normalizeReward } from "./adminLoyaltyRewards";

const STORAGE_KEY = "charmiss:admin:loyalty:rewards";

function baseline(): AdminReward[] {
  return buildMockRewards();
}

function nowSyncLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `18 ก.ย. 2569 ${hh}:${mm} น.`;
}

type AdminRewardContextValue = {
  rewards: Accessor<AdminReward[]>;
  getById: (id: string) => AdminReward | undefined;
  lastSyncedAt: Accessor<string>;
  /** Refreshes only the Charmiss Club CRM-owned fields (mock: just bumps `syncedAt`) — never touches the Presentation layer. */
  syncSelected: (ids: string[]) => Promise<void>;
  syncAll: () => Promise<void>;
  /** The *only* write path into a Reward's Charmiss-owned Presentation/Ecommerce fields — never `name`/`rewardType`/`coinCost`/`stockRemaining`/`status`/dates (the CRM's Coin/Redemption Logic, read-only). */
  updatePresentation: (id: string, input: RewardPresentationValues) => Promise<void>;
};

const AdminRewardContext = createContext<AdminRewardContextValue>();

/** Loyalty (Phase 08.4) — "ของรางวัล". Split-ownership store: Charmiss Club CRM-owned fields are sync-only (same shape as every other Loyalty module here); Presentation/Ecommerce fields are the one thing Charmiss can actually edit. */
export function AdminRewardProvider(props: { children: JSX.Element }) {
  const [rewards, setRewards] = createSignal<AdminReward[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRewards((JSON.parse(raw) as AdminReward[]).map(normalizeReward));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminReward[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminReward[]) => AdminReward[]) => {
    setRewards((list) => {
      const next = fn(list).map(normalizeReward);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => rewards().find((r) => r.id === id);

  const lastSyncedAt = createMemo(() => {
    const list = rewards();
    if (list.length === 0) return "-";
    return list.reduce((latest, r) => (r.syncedAt > latest ? r.syncedAt : latest), list[0].syncedAt);
  });

  const syncSelected: AdminRewardContextValue["syncSelected"] = async (ids) => {
    await simulateDelay();
    const label = nowSyncLabel();
    const idSet = new Set(ids);
    mutate((list) => list.map((r) => (idSet.has(r.id) ? { ...r, syncedAt: label } : r)));
  };

  const syncAll: AdminRewardContextValue["syncAll"] = async () => {
    await simulateDelay();
    const label = nowSyncLabel();
    mutate((list) => list.map((r) => ({ ...r, syncedAt: label })));
  };

  const updatePresentation: AdminRewardContextValue["updatePresentation"] = async (id, input) => {
    await simulateDelay();
    mutate((list) => list.map((r) => (r.id === id ? { ...r, ...input } : r)));
  };

  return (
    <AdminRewardContext.Provider value={{ rewards, getById, lastSyncedAt, syncSelected, syncAll, updatePresentation }}>
      {props.children}
    </AdminRewardContext.Provider>
  );
}

export function useAdminRewards() {
  const ctx = useContext(AdminRewardContext);
  if (!ctx) throw new Error("useAdminRewards must be used within AdminRewardProvider");
  return ctx;
}
