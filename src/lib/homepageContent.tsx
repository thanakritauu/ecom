import { createContext, createMemo, useContext, type Accessor, type JSX } from "solid-js";
import { isPromotionPageVisible } from "./adminContent";
import type { HomepageSection } from "./pageSections";
import { useLandingPages } from "./promotionPages";
import { buildBuiltinSections } from "./adminHomepage";

type HomepageContentContextValue = {
  /** `false` only for the one frame before the underlying Promotion Page provider's own real (client-only) read has happened. */
  ready: Accessor<boolean>;
  sections: Accessor<HomepageSection[]>;
};

const HomepageContentContext = createContext<HomepageContentContextValue>();

/**
 * Promotion Page / Homepage Architecture §8/§36/§37 — Homepage is not a
 * separate store anymore. This provider is now a thin derived view over the
 * exact same Promotion Page data every other page reads (`useLandingPages()`,
 * the storefront's read-only mirror of `adminContentStore.tsx`): it finds
 * the one page where `isHomepage` is `true` and exposes its `sections`. No
 * `localStorage` key of its own, no separate draft/published snapshot — the
 * one PromotionPage record IS the draft and the published copy, gated by the
 * same `status` lifecycle every other Promotion Page uses (§13).
 *
 * `HeroBanner.tsx`/`routes/index.tsx` keep calling `useHomepageContent()`
 * exactly as before — this file's public shape (`{ready, sections}`) is
 * unchanged, so folding Homepage into the Promotion Page store required no
 * changes at either of those call sites.
 */
export function HomepageContentProvider(props: { children: JSX.Element }) {
  const landingPages = useLandingPages();
  const homepage = () => landingPages.pages().find((p) => p.isHomepage);
  const sections = createMemo<HomepageSection[]>(() => {
    const page = homepage();
    // A hidden (or missing) homepage still shows the built-in blocks, as `/` always did when they were hardcoded.
    return page && isPromotionPageVisible(page) ? page.sections : buildBuiltinSections();
  });

  return <HomepageContentContext.Provider value={{ ready: landingPages.ready, sections }}>{props.children}</HomepageContentContext.Provider>;
}

export function useHomepageContent() {
  const ctx = useContext(HomepageContentContext);
  if (!ctx) throw new Error("useHomepageContent must be used within HomepageContentProvider");
  return ctx;
}
