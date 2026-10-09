import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  normalizePromotionPage,
  buildMockPromotionPages,
  withLateSeedPages,
  upgradePromotionPageSeeds,
  PROMOTION_PAGE_SEED_VERSION,
  type PromotionPage,
} from "./adminContent";

/** Same key `adminContentStore.tsx` (the Admin side's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:content:promotionPages";
/** Same seed-version key the Admin store tracks — a browser that hasn't opened Admin since a seed bump still sees the upgraded seeds (applied in memory only). */
const SEED_VERSION_KEY = "charmiss:admin:content:promotionPages:seedVersion";

/**
 * Landing Page Architecture — root-cause fix: this provider used to fall
 * back to `[]` (both in `readStoredPages()`'s empty branch and as the
 * `createSignal`'s initial value), which meant a fresh browser that had
 * never opened Admin — so `charmiss:admin:content:promotionPages` was never
 * written — resolved every `/promotion/:slug` link to "not found", even for
 * the seeded pages Admin itself would show as existing. Same fix already
 * applied to `collectionContent.tsx`/
 * `categoryContent.tsx`: fall back to the same normalized baseline
 * `adminContentStore.tsx` starts from, used as BOTH the empty-storage
 * fallback AND the signal's initial value, so SSR and the client's first
 * paint already show the real seeded pages instead of an empty flash.
 */
function fallbackPages(): PromotionPage[] {
  return buildMockPromotionPages().map(normalizePromotionPage);
}

function readStoredPages(): PromotionPage[] {
  if (isServer) return fallbackPages();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackPages();
    const loaded = withLateSeedPages((JSON.parse(raw) as PromotionPage[]).map(normalizePromotionPage));
    const storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY) ?? "1") || 1;
    return storedVersion < PROMOTION_PAGE_SEED_VERSION ? upgradePromotionPageSeeds(loaded, storedVersion).map(normalizePromotionPage) : loaded;
  } catch {
    return fallbackPages();
  }
}

type PromotionPagesContextValue = {
  /** `false` until the real (client-only) read has happened — SSR and the client's first paint both render the same baseline (see `fallbackPages`), so there's no hydration mismatch. */
  ready: Accessor<boolean>;
  pages: Accessor<PromotionPage[]>;
  getBySlug: (slug: string) => PromotionPage | undefined;
};

const PromotionPagesContext = createContext<PromotionPagesContextValue>();

export function PromotionPagesProvider(props: { children: JSX.Element }) {
  const [pages, setPages] = createSignal<PromotionPage[]>(fallbackPages());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setPages(readStoredPages());
    setReady(true);
  });

  const getBySlug = (slug: string) => pages().find((p) => p.slug === slug);

  return <PromotionPagesContext.Provider value={{ ready, pages, getBySlug }}>{props.children}</PromotionPagesContext.Provider>;
}

export function usePromotionPages() {
  const ctx = useContext(PromotionPagesContext);
  if (!ctx) throw new Error("usePromotionPages must be used within PromotionPagesProvider");
  return ctx;
}

/**
 * Landing Page Architecture & Promotion Page Migration — public aliases.
 * `PromotionPagesProvider`/`usePromotionPages` above are the load-bearing
 * implementation (same storage key, same route contract); `LandingPagesProvider`/
 * `useLandingPages` are the new names new code should reach for, pointing at
 * the exact same provider — not a second navigation/data system.
 */
export const LandingPagesProvider = PromotionPagesProvider;
export const useLandingPages = usePromotionPages;
