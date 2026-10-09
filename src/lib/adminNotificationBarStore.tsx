import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type PromotionStripState,
  type PromotionStripContent,
  buildMockPromotionStripState,
  normalizePromotionStripState,
  readStoredPromotionStrip,
  PROMOTION_STRIP_CHANGED_EVENT,
  PROMOTION_STRIP_STORAGE_KEY,
} from "./adminNotificationBar";
import { formatOrderDateLabel } from "./adminOrders";

type AdminNotificationBarContextValue = {
  state: Accessor<PromotionStripState>;
  updatePurple: (content: PromotionStripContent) => Promise<void>;
  updatePink: (content: PromotionStripContent) => Promise<void>;
  /** On/off for the purple bar. The pink bar is always shown. */
  setPurpleEnabled: (enabled: boolean) => Promise<void>;
};

const AdminNotificationBarContext = createContext<AdminNotificationBarContextValue>();

export function AdminNotificationBarProvider(props: { children: JSX.Element }) {
  const [state, setState] = createSignal<PromotionStripState>(buildMockPromotionStripState());

  onMount(() => setState(readStoredPromotionStrip()));

  const persist = (next: PromotionStripState) => {
    if (isServer) return;
    try {
      localStorage.setItem(PROMOTION_STRIP_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PROMOTION_STRIP_CHANGED_EVENT));
    } catch {}
  };

  const mutate = (fn: (current: PromotionStripState) => PromotionStripState) => {
    const next = normalizePromotionStripState({ ...fn(state()), updatedAt: formatOrderDateLabel(new Date().toISOString()) });
    setState(next);
    persist(next);
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

  const updatePurple: AdminNotificationBarContextValue["updatePurple"] = async (content) => {
    await simulateDelay();
    mutate((current) => ({ ...current, purple: { ...content, enabled: current.purple.enabled } }));
  };

  const updatePink: AdminNotificationBarContextValue["updatePink"] = async (content) => {
    await simulateDelay();
    mutate((current) => ({ ...current, pink: content }));
  };

  const setPurpleEnabled: AdminNotificationBarContextValue["setPurpleEnabled"] = async (enabled) => {
    await simulateDelay();
    mutate((current) => ({ ...current, purple: { ...current.purple, enabled } }));
  };

  return (
    <AdminNotificationBarContext.Provider value={{ state, updatePurple, updatePink, setPurpleEnabled }}>
      {props.children}
    </AdminNotificationBarContext.Provider>
  );
}

export function useAdminNotificationBar() {
  const ctx = useContext(AdminNotificationBarContext);
  if (!ctx) throw new Error("useAdminNotificationBar must be used within AdminNotificationBarProvider");
  return ctx;
}
