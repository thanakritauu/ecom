import { createContext, createMemo, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type HomepageSection, normalizeHomepageSection, buildHomepageSectionBaseline } from "./adminHomepage";

const DRAFT_KEY = "charmiss:admin:content:homepage:draft";
const PUBLISHED_KEY = "charmiss:admin:content:homepage:published";
const TODAY_LABEL = "18 ก.ย. 2569";

/**
 * `hasUnpublishedChanges`/the Overview's "pending changes" count compare
 * draft vs published with `JSON.stringify`, which is sensitive to *key
 * order* — every persisted section round-trips through
 * `normalizeHomepageSection` (a fixed key order) once saved, but the raw
 * `buildHomepageSectionBaseline()` object literals don't share that same
 * order. Normalizing the baseline here too means both snapshots start from
 * an identical key order on a fresh install, so "nothing has changed yet"
 * actually compares equal instead of every section false-flagging as
 * "changed" before the first real edit.
 */
function normalizedBaseline(): HomepageSection[] {
  return buildHomepageSectionBaseline().map(normalizeHomepageSection);
}

function readSections(key: string): HomepageSection[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return (JSON.parse(raw) as HomepageSection[]).map(normalizeHomepageSection);
  } catch {
    return null;
  }
}

function persistSections(key: string, sections: HomepageSection[]) {
  if (isServer) return;
  try {
    localStorage.setItem(key, JSON.stringify(sections));
  } catch {}
}

type AdminHomepageContextValue = {
  draftSections: Accessor<HomepageSection[]>;
  publishedSections: Accessor<HomepageSection[]>;
  draftUpdatedAt: Accessor<string>;
  publishedUpdatedAt: Accessor<string>;
  hasUnpublishedChanges: Accessor<boolean>;
  /** §24 "บันทึกแบบร่าง" — commits the Editor's working copy to the draft snapshot only; the storefront (always reading Published) never sees this. */
  saveDraft: (sections: HomepageSection[]) => Promise<void>;
  /** §24 "เผยแพร่" — draft and published become the same snapshot; this is the one moment the storefront's content actually changes. */
  publish: (sections: HomepageSection[]) => Promise<void>;
};

const AdminHomepageContext = createContext<AdminHomepageContextValue>();

/**
 * §24/§26/§27 — draft/published kept as two independent persisted
 * snapshots (not one array with a per-section "published" flag) so
 * Save-Draft-vs-Publish reads exactly like a small CMS workflow: editing
 * never touches what the storefront renders until an explicit Publish.
 * Same SSR-safe pattern as every other Admin store — baseline on the server
 * and the client's first render, real `localStorage` reads deferred to
 * `onMount`.
 */
export function AdminHomepageProvider(props: { children: JSX.Element }) {
  const [draftSections, setDraftSections] = createSignal<HomepageSection[]>(normalizedBaseline());
  const [publishedSections, setPublishedSections] = createSignal<HomepageSection[]>(normalizedBaseline());
  const [draftUpdatedAt, setDraftUpdatedAt] = createSignal(TODAY_LABEL);
  const [publishedUpdatedAt, setPublishedUpdatedAt] = createSignal(TODAY_LABEL);

  onMount(() => {
    const persistedDraft = readSections(DRAFT_KEY);
    const persistedPublished = readSections(PUBLISHED_KEY);
    if (persistedDraft) setDraftSections(persistedDraft);
    if (persistedPublished) setPublishedSections(persistedPublished);
  });

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));

  const saveDraft: AdminHomepageContextValue["saveDraft"] = async (sections) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const normalized = sections.map(normalizeHomepageSection);
    setDraftSections(normalized);
    setDraftUpdatedAt(TODAY_LABEL);
    persistSections(DRAFT_KEY, normalized);
  };

  const publish: AdminHomepageContextValue["publish"] = async (sections) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const normalized = sections.map(normalizeHomepageSection);
    setDraftSections(normalized);
    setPublishedSections(normalized);
    setDraftUpdatedAt(TODAY_LABEL);
    setPublishedUpdatedAt(TODAY_LABEL);
    persistSections(DRAFT_KEY, normalized);
    persistSections(PUBLISHED_KEY, normalized);
  };

  const hasUnpublishedChanges = createMemo(() => JSON.stringify(draftSections()) !== JSON.stringify(publishedSections()));

  return (
    <AdminHomepageContext.Provider value={{ draftSections, publishedSections, draftUpdatedAt, publishedUpdatedAt, hasUnpublishedChanges, saveDraft, publish }}>
      {props.children}
    </AdminHomepageContext.Provider>
  );
}

export function useAdminHomepage() {
  const ctx = useContext(AdminHomepageContext);
  if (!ctx) throw new Error("useAdminHomepage must be used within AdminHomepageProvider");
  return ctx;
}
