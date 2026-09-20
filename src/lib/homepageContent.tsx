import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { type HomepageSection, normalizeHomepageSection, buildHomepageSectionBaseline } from "./adminHomepage";

/** Same key `adminHomepageStore.tsx` publishes to — read-only here, and only ever the *published* snapshot (§24: the storefront must never render draft-only edits). */
const PUBLISHED_KEY = "charmiss:admin:content:homepage:published";

/** Normalized (not the raw baseline literal) for the same reason `adminHomepageStore.tsx`'s `normalizedBaseline()` is — a consistent key order everywhere a `HomepageSection[]` can come from. */
function fallbackSections(): HomepageSection[] {
  return buildHomepageSectionBaseline().map(normalizeHomepageSection);
}

function readPublishedSections(): HomepageSection[] {
  if (isServer) return fallbackSections();
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY);
    if (!raw) return fallbackSections();
    return (JSON.parse(raw) as HomepageSection[]).map(normalizeHomepageSection);
  } catch {
    return fallbackSections();
  }
}

type HomepageContentContextValue = {
  /** `false` only for the one frame before `onMount`'s real read — SSR always renders the same baseline the client's first paint does, so there's no hydration mismatch to guard against here (unlike Promotion Pages' nav, this content must never be empty-by-default). */
  ready: Accessor<boolean>;
  sections: Accessor<HomepageSection[]>;
};

const HomepageContentContext = createContext<HomepageContentContextValue>();

/**
 * §23 — the storefront's one read path into the same Homepage content Admin
 * publishes; on the server (and the client's first paint) this is the exact
 * same `buildHomepageSectionBaseline()` `adminHomepageStore.tsx` starts
 * from, so a fresh browser's Home page already matches what Admin sees
 * before ever touching localStorage — never a second, independently
 * maintained "frontend homepage data set".
 */
export function HomepageContentProvider(props: { children: JSX.Element }) {
  const [sections, setSections] = createSignal<HomepageSection[]>(fallbackSections());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setSections(readPublishedSections());
    setReady(true);
  });

  return <HomepageContentContext.Provider value={{ ready, sections }}>{props.children}</HomepageContentContext.Provider>;
}

export function useHomepageContent() {
  const ctx = useContext(HomepageContentContext);
  if (!ctx) throw new Error("useHomepageContent must be used within HomepageContentProvider");
  return ctx;
}
