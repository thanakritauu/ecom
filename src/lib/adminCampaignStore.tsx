import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type Campaign,
  type CampaignStatus,
  type CampaignFormValues,
  buildMockCampaigns,
  normalizeCampaign,
} from "./adminCampaigns";

const STORAGE_KEY = "charmiss:admin:content:campaigns";
const TODAY_LABEL = "18 ก.ย. 2569";
let nextId = 1000;

type AdminCampaignContextValue = {
  campaigns: Accessor<Campaign[]>;
  getById: (id: string) => Campaign | undefined;
  add: (input: CampaignFormValues) => Promise<Campaign>;
  update: (id: string, input: CampaignFormValues) => Promise<Campaign>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: CampaignStatus) => Promise<void>;
};

const AdminCampaignContext = createContext<AdminCampaignContextValue>();

/**
 * Same SSR-safe shape as `adminContentStore.tsx` — pure baseline on server +
 * first client render, real `localStorage` read deferred to `onMount`, every
 * write path re-normalized before it can persist a malformed `Campaign` back
 * out.
 */
export function AdminCampaignProvider(props: { children: JSX.Element }) {
  const [campaigns, setCampaigns] = createSignal<Campaign[]>(buildMockCampaigns());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCampaigns((JSON.parse(raw) as Campaign[]).map(normalizeCampaign));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: Campaign[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: Campaign[]) => Campaign[]) => {
    setCampaigns((list) => {
      const next = fn(list).map(normalizeCampaign);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => campaigns().find((c) => c.id === id);

  const add: AdminCampaignContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: Campaign = { ...input, id: `campaign-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminCampaignContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: Campaign | undefined;
    mutate((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const remove: AdminCampaignContextValue["remove"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((c) => c.id !== id));
  };

  const setStatus: AdminCampaignContextValue["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((c) => (c.id === id ? { ...c, status, updatedAt: TODAY_LABEL } : c)));
  };

  return (
    <AdminCampaignContext.Provider value={{ campaigns, getById, add, update, remove, setStatus }}>
      {props.children}
    </AdminCampaignContext.Provider>
  );
}

export function useAdminCampaigns() {
  const ctx = useContext(AdminCampaignContext);
  if (!ctx) throw new Error("useAdminCampaigns must be used within AdminCampaignProvider");
  return ctx;
}
