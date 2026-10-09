import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { normalizeCategory, buildMockCategories, type AdminCategory } from "./adminCategories";

/** Same key `adminCategoryStore.tsx` (Admin's source of truth) persists to — read-only here, never written from the customer side. */
const STORAGE_KEY = "charmiss:admin:catalog:categories:v2"; // v2 = คุชชั่น / ลิป / แก้ม / ตาและคิ้ว / ดูแลผิว / กันแดดและบอดี้แคร์

/**
 * Falls back to the same seed baseline `adminCategoryStore.tsx` starts from
 * — same reasoning as `collectionContent.tsx`: other
 * admin-authored content (a Homepage/Promotion Page "category" destination)
 * can reference a seeded Category's id before any admin has ever opened the
 * Categories module once. Used as BOTH the `onMount` fallback and the
 * `createSignal`'s initial value (the bug those two other providers had
 * until this same pass fixed it) so SSR and the client's first paint render
 * the identical baseline — never an empty nav row that then "pops in".
 */
function fallbackCategories(): AdminCategory[] {
  return buildMockCategories().map(normalizeCategory);
}

function readStoredCategories(): AdminCategory[] {
  if (isServer) return fallbackCategories();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackCategories();
    return (JSON.parse(raw) as AdminCategory[]).map(normalizeCategory);
  } catch {
    return fallbackCategories();
  }
}

type CategoryContentContextValue = {
  ready: Accessor<boolean>;
  categories: Accessor<AdminCategory[]>;
  getById: (id: string) => AdminCategory | undefined;
  /**
   * Global Frontend Navigation Architecture — the Top Navigation's category
   * row (Header/MobileMenu) reads from here instead of a hardcoded list:
   * active-only, in the same order Admin's Category Management stores them
   * (CMS + Frontend Final Refinement §5 — Display Order field removed, no
   * replacement; storage order is the order). Never hardcode a category nav
   * item outside this provider.
   */
  navCategories: Accessor<AdminCategory[]>;
};

const CategoryContentContext = createContext<CategoryContentContextValue>();

/** The storefront's one read path into the same Category data Admin manages — no second, independently-maintained "frontend category list". */
export function CategoryContentProvider(props: { children: JSX.Element }) {
  const [categories, setCategories] = createSignal<AdminCategory[]>(fallbackCategories());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setCategories(readStoredCategories());
    setReady(true);
  });

  const getById = (id: string) => categories().find((c) => c.id === id);
  const navCategories = () => categories().filter((c) => c.status === "active");

  return <CategoryContentContext.Provider value={{ ready, categories, getById, navCategories }}>{props.children}</CategoryContentContext.Provider>;
}

export function useCategoryContent() {
  const ctx = useContext(CategoryContentContext);
  if (!ctx) throw new Error("useCategoryContent must be used within CategoryContentProvider");
  return ctx;
}
