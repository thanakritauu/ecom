import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type PromotionStripState, type PromotionStripContent, buildMockPromotionStripState, normalizePromotionStripState } from "./adminNotificationBar";

const STORAGE_KEY = "charmiss:admin:promotion-strip";
const TODAY_LABEL = "22 ก.ย. 2569";

type AdminNotificationBarContextValue = {
  state: Accessor<PromotionStripState>;
  updatePurple: (content: PromotionStripContent) => Promise<void>;
  updatePink: (content: PromotionStripContent) => Promise<void>;
  /** §05 — the one on/off switch for the purple strip. The pink strip has no equivalent (§06 — always visible). */
  togglePurpleEnabled: () => Promise<void>;
};

const AdminNotificationBarContext = createContext<AdminNotificationBarContextValue>();

export function AdminNotificationBarProvider(props: { children: JSX.Element }) {
  const [state, setState] = createSignal<PromotionStripState>(buildMockPromotionStripState());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(normalizePromotionStripState(JSON.parse(raw) as PromotionStripState));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (next: PromotionStripState) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const mutate = (fn: (current: PromotionStripState) => PromotionStripState) => {
    setState((current) => {
      const next = normalizePromotionStripState(fn(current));
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

  const updatePurple: AdminNotificationBarContextValue["updatePurple"] = async (content) => {
    await simulateDelay();
    mutate((current) => ({ ...current, purple: { ...content, enabled: current.purple.enabled }, updatedAt: TODAY_LABEL }));
  };

  const updatePink: AdminNotificationBarContextValue["updatePink"] = async (content) => {
    await simulateDelay();
    mutate((current) => ({ ...current, pink: content, updatedAt: TODAY_LABEL }));
  };

  const togglePurpleEnabled: AdminNotificationBarContextValue["togglePurpleEnabled"] = async () => {
    await simulateDelay();
    mutate((current) => ({ ...current, purple: { ...current.purple, enabled: !current.purple.enabled }, updatedAt: TODAY_LABEL }));
  };

  return (
    <AdminNotificationBarContext.Provider value={{ state, updatePurple, updatePink, togglePurpleEnabled }}>
      {props.children}
    </AdminNotificationBarContext.Provider>
  );
}

export function useAdminNotificationBar() {
  const ctx = useContext(AdminNotificationBarContext);
  if (!ctx) throw new Error("useAdminNotificationBar must be used within AdminNotificationBarProvider");
  return ctx;
}
