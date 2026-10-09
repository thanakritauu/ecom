import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";

/**
 * "รีวิวสินค้า" show/hide on the catalog's own reviews (`product.reviews`,
 * the ones the PDP lists 5 at a time and the Option Modal shows). Only the
 * hidden set is stored; the reviews stay on the product. The storefront
 * reads the same key (`productCatalog.tsx` drops hidden reviews), live via
 * `storage` + `HIDDEN_REVIEWS_CHANGED_EVENT`.
 *
 * Module-level store (no Provider), same as `adminTiktokClips.ts`. A review
 * id alone isn't unique (products share the generated review set), so the
 * key is `productId:reviewId`.
 */
export const HIDDEN_REVIEWS_STORAGE_KEY = "charmiss:admin:reviews:hidden";
export const HIDDEN_REVIEWS_CHANGED_EVENT = "charmiss:hidden-reviews-changed";

export const reviewKey = (productId: string, reviewId: string) => `${productId}:${reviewId}`;

/** The stored hidden set (empty on the server or when nothing is stored). */
export function readHiddenReviewKeys(): Set<string> {
  if (isServer) return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_REVIEWS_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

const [hidden, setHidden] = createSignal<ReadonlySet<string>>(new Set());
let hydrated = false;

function hydrate() {
  if (hydrated || isServer) return;
  hydrated = true;
  setHidden(readHiddenReviewKeys());
}

export function useAdminProductReviews() {
  onMount(hydrate);
  return {
    isHidden: (productId: string, reviewId: string) => hidden().has(reviewKey(productId, reviewId)),
    hiddenCount: () => hidden().size,
    setHidden: (productId: string, reviewId: string, value: boolean) => {
      const next = new Set(hidden());
      if (value) next.add(reviewKey(productId, reviewId));
      else next.delete(reviewKey(productId, reviewId));
      setHidden(next);
      if (isServer) return;
      try {
        localStorage.setItem(HIDDEN_REVIEWS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      window.dispatchEvent(new Event(HIDDEN_REVIEWS_CHANGED_EVENT));
    },
  };
}
