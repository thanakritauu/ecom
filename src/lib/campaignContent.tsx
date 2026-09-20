import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { normalizeCampaign, isCampaignVisible, buildMockCampaigns, type Campaign } from "./adminCampaigns";

/** Same key `adminCampaignStore.tsx` (Admin's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:content:campaigns";

/**
 * Falls back to the same seed baseline `adminCampaignStore.tsx` starts from
 * — needed because a Homepage "campaign" section can link to a seeded
 * Campaign's id before any admin has ever opened/saved the Campaigns module
 * once, which would otherwise leave `charmiss:admin:content:campaigns`
 * absent from localStorage even though the Campaign genuinely exists from
 * Admin's point of view (mirrors `homepageContent.tsx`'s `fallbackSections`).
 */
function fallbackCampaigns(): Campaign[] {
  return buildMockCampaigns().map(normalizeCampaign);
}

function readStoredCampaigns(): Campaign[] {
  if (isServer) return fallbackCampaigns();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackCampaigns();
    return (JSON.parse(raw) as Campaign[]).map(normalizeCampaign);
  } catch {
    return fallbackCampaigns();
  }
}

type CampaignContentContextValue = {
  /** `false` until the real (client-only) read has happened — matches every other read-only storefront provider's SSR-safe shape (`promotionPages.tsx`, `homepageContent.tsx`). */
  ready: Accessor<boolean>;
  campaigns: Accessor<Campaign[]>;
  getById: (id: string) => Campaign | undefined;
  /** §10.6 Publishing Logic — only a Campaign that's Published *and* currently within its own schedule window is fit to show anywhere on the storefront (Homepage's linked Campaign section calls this before falling back to "not shown"). */
  getVisibleById: (id: string) => Campaign | undefined;
};

const CampaignContentContext = createContext<CampaignContentContextValue>();

/** §10.6 — the storefront's one read path into the same Campaign data Admin manages; a Homepage "campaign" section that links `campaignId` resolves its Banner/Title/Description/CTA/Products from here, never a second hand-copied version. */
export function CampaignContentProvider(props: { children: JSX.Element }) {
  const [campaigns, setCampaigns] = createSignal<Campaign[]>(fallbackCampaigns());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setCampaigns(readStoredCampaigns());
    setReady(true);
  });

  const getById = (id: string) => campaigns().find((c) => c.id === id);
  const getVisibleById = (id: string) => {
    const c = getById(id);
    return c && isCampaignVisible(c) ? c : undefined;
  };

  return <CampaignContentContext.Provider value={{ ready, campaigns, getById, getVisibleById }}>{props.children}</CampaignContentContext.Provider>;
}

export function useCampaignContent() {
  const ctx = useContext(CampaignContentContext);
  if (!ctx) throw new Error("useCampaignContent must be used within CampaignContentProvider");
  return ctx;
}
