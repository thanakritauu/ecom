import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type AdminMission, buildMockMissions, normalizeMission } from "./adminLoyaltyMissions";

const STORAGE_KEY = "charmiss:admin:loyalty:missions";

function baseline(): AdminMission[] {
  return buildMockMissions();
}

function nowSyncLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `18 ก.ย. 2569 ${hh}:${mm} น.`;
}

type AdminMissionContextValue = {
  missions: Accessor<AdminMission[]>;
  getById: (id: string) => AdminMission | undefined;
  lastSyncedAt: Accessor<string>;
  syncSelected: (ids: string[]) => Promise<void>;
  syncAll: () => Promise<void>;
};

const AdminMissionContext = createContext<AdminMissionContextValue>();

/** Loyalty (Phase 08.3) — "ภารกิจ" as a Charmiss Club CRM Integration view. Same read-only, sync-only shape as `adminLoyaltyStore.tsx`/`adminLoyaltyMemberStore.tsx`. */
export function AdminMissionProvider(props: { children: JSX.Element }) {
  const [missions, setMissions] = createSignal<AdminMission[]>(baseline());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMissions((JSON.parse(raw) as AdminMission[]).map(normalizeMission));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: AdminMission[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: AdminMission[]) => AdminMission[]) => {
    setMissions((list) => {
      const next = fn(list).map(normalizeMission);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => missions().find((m) => m.id === id);

  const lastSyncedAt = createMemo(() => {
    const list = missions();
    if (list.length === 0) return "-";
    return list.reduce((latest, m) => (m.syncedAt > latest ? m.syncedAt : latest), list[0].syncedAt);
  });

  const syncSelected: AdminMissionContextValue["syncSelected"] = async (ids) => {
    await simulateDelay();
    const label = nowSyncLabel();
    const idSet = new Set(ids);
    mutate((list) => list.map((m) => (idSet.has(m.id) ? { ...m, syncedAt: label } : m)));
  };

  const syncAll: AdminMissionContextValue["syncAll"] = async () => {
    await simulateDelay();
    const label = nowSyncLabel();
    mutate((list) => list.map((m) => ({ ...m, syncedAt: label })));
  };

  return (
    <AdminMissionContext.Provider value={{ missions, getById, lastSyncedAt, syncSelected, syncAll }}>{props.children}</AdminMissionContext.Provider>
  );
}

export function useAdminMissions() {
  const ctx = useContext(AdminMissionContext);
  if (!ctx) throw new Error("useAdminMissions must be used within AdminMissionProvider");
  return ctx;
}
