import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { normalizePromotionPage, isPromotionPageInNav, buildMockPromotionPages, type PromotionPage } from "./adminContent";

/** Same key `adminContentStore.tsx` (the Admin side's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:content:promotionPages";

/**
 * Landing Page Architecture — root-cause fix: this provider used to fall
 * back to `[]` (both in `readStoredPages()`'s empty branch and as the
 * `createSignal`'s initial value), which meant a fresh browser that had
 * never opened Admin — so `charmiss:admin:content:promotionPages` was never
 * written — resolved every `/promotion/:slug` link to "not found", even for
 * the seeded pages Admin itself would show as existing. Same fix already
 * applied to `collectionContent.tsx`/`campaignContent.tsx`/
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
    return (JSON.parse(raw) as PromotionPage[]).map(normalizePromotionPage);
  } catch {
    return fallbackPages();
  }
}

export type PromotionNavItem = { slug: string; label: string; icon: string; order: number; href: string };

type PromotionPagesContextValue = {
  /** `false` until the real (client-only) read has happened — SSR and the client's first paint both render the same baseline (see `fallbackPages`), so there's no hydration mismatch. */
  ready: Accessor<boolean>;
  pages: Accessor<PromotionPage[]>;
  getBySlug: (slug: string) => PromotionPage | undefined;
  /** Frontend Top Navigation add-on §6/§11 — derived from `pages()` on every read, never a second stored list, so Publish/Unpublish/Edit/Delete in Admin are reflected here for free. */
  navItems: Accessor<PromotionNavItem[]>;
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

  const navItems = createMemo<PromotionNavItem[]>(() => {
    const now = Date.now();
    return pages()
      .filter((p) => isPromotionPageInNav(p, now))
      .map((p) => ({ slug: p.slug, label: p.navigation.label, icon: p.navigation.icon, order: p.navigation.order, href: `/promotion/${p.slug}` }))
      .sort((a, b) => a.order - b.order);
  });

  return <PromotionPagesContext.Provider value={{ ready, pages, getBySlug, navItems }}>{props.children}</PromotionPagesContext.Provider>;
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
