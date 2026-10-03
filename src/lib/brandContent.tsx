import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { normalizeBrand, buildMockBrands, type AdminBrand } from "./adminBrands";

/** Same key `adminBrandStore.tsx` (Admin's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:catalog:brands";

/**
 * Product / Category / Brand / Collection Source-of-Truth Cleanup §25 —
 * Brand had no storefront read path at all before this (Admin-only entity).
 * Same "Admin store + read-only mirror" pattern every other classification
 * entity already uses (`categoryContent.tsx`, this file's direct template),
 * so `/products?brand=<slug>` (and any future Brand-targeting UI) reads the
 * same Brand data Admin manages instead of a second, hand-rolled lookup.
 */
function fallbackBrands(): AdminBrand[] {
  return buildMockBrands().map(normalizeBrand);
}

function readStoredBrands(): AdminBrand[] {
  if (isServer) return fallbackBrands();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackBrands();
    return (JSON.parse(raw) as AdminBrand[]).map(normalizeBrand);
  } catch {
    return fallbackBrands();
  }
}

type BrandContentContextValue = {
  ready: Accessor<boolean>;
  brands: Accessor<AdminBrand[]>;
  getById: (id: string) => AdminBrand | undefined;
  getBySlug: (slug: string) => AdminBrand | undefined;
  /** Active-only, in storage order (no Display Order field — same shape as `categoryContent.tsx`'s `navCategories`) — for any storefront surface that wants to list Brands (e.g. a future filter UI) without duplicating this filter itself. */
  activeBrands: Accessor<AdminBrand[]>;
};

const BrandContentContext = createContext<BrandContentContextValue>();

/** The storefront's one read path into the same Brand data Admin manages — no second, independently-maintained "frontend brand list". */
export function BrandContentProvider(props: { children: JSX.Element }) {
  const [brands, setBrands] = createSignal<AdminBrand[]>(fallbackBrands());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setBrands(readStoredBrands());
    setReady(true);
  });

  const getById = (id: string) => brands().find((b) => b.id === id);
  const getBySlug = (slug: string) => brands().find((b) => b.slug === slug);
  const activeBrands = () => brands().filter((b) => b.status === "active");

  return <BrandContentContext.Provider value={{ ready, brands, getById, getBySlug, activeBrands }}>{props.children}</BrandContentContext.Provider>;
}

export function useBrandContent() {
  const ctx = useContext(BrandContentContext);
  if (!ctx) throw new Error("useBrandContent must be used within BrandContentProvider");
  return ctx;
}
