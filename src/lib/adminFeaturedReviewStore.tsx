import { createContext, createSignal, onMount, useContext, type Accessor, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import type { SocialReview } from "./socialReviews";
import {
  FEATURED_REVIEWS_STORAGE_KEY,
  buildMockFeaturedAssignments,
  normalizeFeaturedAssignments,
  type FeaturedReviewAssignment,
} from "./featuredReviews";

const TODAY_LABEL = "18 ก.ย. 2569";

type AdminFeaturedReviewContextValue = {
  assignments: Accessor<FeaturedReviewAssignment[]>;
  getForProduct: (productId: string) => SocialReview[];
  /** Replaces the product's whole featured list (order included); an empty list un-features everything. */
  saveForProduct: (productId: string, reviews: SocialReview[]) => Promise<void>;
};

const AdminFeaturedReviewContext = createContext<AdminFeaturedReviewContextValue>();

/** Same SSR-safe store shape as `adminCollectionStore.tsx` — baseline first, `localStorage` read on mount, every write re-normalized. */
export function AdminFeaturedReviewProvider(props: { children: JSX.Element }) {
  const [assignments, setAssignments] = createSignal<FeaturedReviewAssignment[]>(buildMockFeaturedAssignments());

  onMount(() => {
    try {
      const raw = localStorage.getItem(FEATURED_REVIEWS_STORAGE_KEY);
      if (raw) setAssignments(normalizeFeaturedAssignments(JSON.parse(raw)));
    } catch {
      // storage unavailable — stays in-memory for this tab.
    }
  });

  const persist = (list: FeaturedReviewAssignment[]) => {
    if (isServer) return;
    try {
      localStorage.setItem(FEATURED_REVIEWS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const getForProduct = (productId: string) => assignments().find((a) => a.productId === productId)?.reviews ?? [];

  const saveForProduct: AdminFeaturedReviewContextValue["saveForProduct"] = async (productId, reviews) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400 + Math.random() * 250));
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    setAssignments((list) => {
      const rest = list.filter((a) => a.productId !== productId);
      const next = normalizeFeaturedAssignments([...rest, { productId, reviews, updatedAt: TODAY_LABEL }]);
      persist(next);
      return next;
    });
  };

  return (
    <AdminFeaturedReviewContext.Provider value={{ assignments, getForProduct, saveForProduct }}>{props.children}</AdminFeaturedReviewContext.Provider>
  );
}

export function useAdminFeaturedReviews() {
  const ctx = useContext(AdminFeaturedReviewContext);
  if (!ctx) throw new Error("useAdminFeaturedReviews must be used within AdminFeaturedReviewProvider");
  return ctx;
}
