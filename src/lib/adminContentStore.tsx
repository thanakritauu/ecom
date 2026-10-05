import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import {
  type PromotionPage,
  type PromotionPageStatus,
  type PromotionPageFormValues,
  buildMockPromotionPages,
  normalizePromotionPage,
  isSlugTaken,
  isHomepageAssigned,
  withLateSeedPages,
  upgradePromotionPageSeeds,
  PROMOTION_PAGE_SEED_VERSION,
} from "./adminContent";

const STORAGE_KEY = "charmiss:admin:content:promotionPages";
/** Separate key, so the storefront's read-only mirror (`promotionPages.tsx`) keeps reading `STORAGE_KEY` unchanged. Missing = v1 (before seed versioning existed). */
const SEED_VERSION_KEY = "charmiss:admin:content:promotionPages:seedVersion";
const TODAY_LABEL = "17 ก.ย. 2569";
let nextId = 1000;

type AdminContentContextValue = {
  pages: Accessor<PromotionPage[]>;
  getById: (id: string) => PromotionPage | undefined;
  add: (input: PromotionPageFormValues) => Promise<PromotionPage>;
  update: (id: string, input: PromotionPageFormValues) => Promise<PromotionPage>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: PromotionPageStatus) => Promise<void>;
  duplicate: (id: string) => Promise<PromotionPage>;
};

const AdminContentContext = createContext<AdminContentContextValue>();

/**
 * Same SSR-safe shape as `adminProductStore.tsx`/`adminMarketingStore.tsx` —
 * pure baseline on server + first client render, real `localStorage` read
 * deferred to `onMount`, every write path re-normalized before it can
 * persist a malformed `PromotionPage` back out.
 */
export function AdminContentProvider(props: { children: JSX.Element }) {
  const [pages, setPages] = createSignal<PromotionPage[]>(buildMockPromotionPages());

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY) ?? "1") || 1;
      if (raw) {
        const loaded = withLateSeedPages((JSON.parse(raw) as PromotionPage[]).map(normalizePromotionPage));
        if (storedVersion < PROMOTION_PAGE_SEED_VERSION) {
          const upgraded = upgradePromotionPageSeeds(loaded, storedVersion).map(normalizePromotionPage);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
          setPages(upgraded);
        } else {
          setPages(loaded);
        }
      }
      localStorage.setItem(SEED_VERSION_KEY, String(PROMOTION_PAGE_SEED_VERSION));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: PromotionPage[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const mutate = (fn: (list: PromotionPage[]) => PromotionPage[]) => {
    setPages((list) => {
      const next = fn(list).map(normalizePromotionPage);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
  const getById = (id: string) => pages().find((p) => p.id === id);

  const add: AdminContentContextValue["add"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    // §34 — defense in depth: the Create form never offers an "Is Homepage"
    // toggle (there's exactly one Homepage, assigned only via the seed), but
    // the store itself must never allow a second one to slip in regardless.
    if (input.isHomepage && isHomepageAssigned(pages())) throw new Error("HOMEPAGE_ALREADY_EXISTS");
    const created: PromotionPage = { ...input, id: `promo-page-${nextId++}`, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL };
    mutate((list) => [created, ...list]);
    return created;
  };

  const update: AdminContentContextValue["update"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    if (input.isHomepage && isHomepageAssigned(pages(), id)) throw new Error("HOMEPAGE_ALREADY_EXISTS");
    let updated: PromotionPage | undefined;
    mutate((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...input, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  /** §44 — the site must never end up with zero Homepages; for this prototype that means Homepage simply cannot be deleted (no "reassign first" flow exists yet). */
  const remove: AdminContentContextValue["remove"] = async (id) => {
    await simulateDelay();
    const target = getById(id);
    if (target?.isHomepage) throw new Error("CANNOT_DELETE_HOMEPAGE");
    mutate((list) => list.filter((p) => p.id !== id));
  };

  const setStatus: AdminContentContextValue["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((p) => (p.id === id ? { ...p, status, updatedAt: TODAY_LABEL } : p)));
  };

  /**
   * §25 — new id, unique slug, Status→Draft, Sections copied by value. Every
   * Product/Collection/Campaign *reference* inside those sections
   * (`products`, `collectionId`, `campaignId`) is copied as plain data —
   * still pointing at the exact same original entities — never a new copy
   * of the entity itself, same "reference, don't duplicate" rule §33
   * enforces everywhere else. Navigation is never copied here — a duplicated
   * page owns no navigation data (Navigation Architecture), so it simply
   * doesn't appear in any menu until an admin explicitly creates a
   * `NavigationItem` pointing at the new page's id.
   */
  const duplicate: AdminContentContextValue["duplicate"] = async (id) => {
    await simulateDelay();
    const source = getById(id);
    if (!source) throw new Error("NOT_FOUND");
    let base = `${source.slug}-copy`;
    let candidate = base;
    let n = 2;
    while (isSlugTaken(pages(), candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    const created: PromotionPage = {
      ...source,
      id: `promo-page-${nextId++}`,
      name: `${source.name} (สำเนา)`,
      slug: candidate,
      // §34 — a duplicate is never the Homepage, even when duplicating the Homepage itself; there is still only ever one.
      isHomepage: false,
      status: "draft",
      sections: source.sections.map((s) => ({ ...s })),
      products: source.products.map((ref) => ({ ...ref })),
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    };
    mutate((list) => [created, ...list]);
    return created;
  };

  return <AdminContentContext.Provider value={{ pages, getById, add, update, remove, setStatus, duplicate }}>{props.children}</AdminContentContext.Provider>;
}

export function useAdminContent() {
  const ctx = useContext(AdminContentContext);
  if (!ctx) throw new Error("useAdminContent must be used within AdminContentProvider");
  return ctx;
}
