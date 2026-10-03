import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { SocialReview } from "./socialReviews";
import {
  FEATURED_REVIEWS_STORAGE_KEY,
  buildMockFeaturedAssignments,
  normalizeFeaturedAssignments,
  type FeaturedReviewAssignment,
} from "./featuredReviews";

function readStored(): FeaturedReviewAssignment[] {
  if (isServer) return buildMockFeaturedAssignments();
  try {
    const raw = localStorage.getItem(FEATURED_REVIEWS_STORAGE_KEY);
    return raw ? normalizeFeaturedAssignments(JSON.parse(raw)) : buildMockFeaturedAssignments();
  } catch {
    return buildMockFeaturedAssignments();
  }
}

type FeaturedReviewContentContextValue = {
  ready: Accessor<boolean>;
  /** Normalized, ordered Featured Reviews for one product — `[]` when none (the PDP then hides the section). */
  getForProduct: (productId: string) => SocialReview[];
};

const FeaturedReviewContentContext = createContext<FeaturedReviewContentContextValue>();

/** The storefront's read-only mirror of Admin's Featured Review selection (same key as `adminFeaturedReviewStore.tsx`, never written here). */
export function FeaturedReviewContentProvider(props: { children: JSX.Element }) {
  const [assignments, setAssignments] = createSignal<FeaturedReviewAssignment[]>(buildMockFeaturedAssignments());
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    setAssignments(readStored());
    setReady(true);
  });

  const getForProduct = (productId: string) => assignments().find((a) => a.productId === productId)?.reviews ?? [];

  return <FeaturedReviewContentContext.Provider value={{ ready, getForProduct }}>{props.children}</FeaturedReviewContentContext.Provider>;
}

export function useFeaturedReviewContent() {
  const ctx = useContext(FeaturedReviewContentContext);
  if (!ctx) throw new Error("useFeaturedReviewContent must be used within FeaturedReviewContentProvider");
  return ctx;
}
