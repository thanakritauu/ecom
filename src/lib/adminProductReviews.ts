import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";

/**
 * "รีวิวสินค้า" — mock show/hide moderation on the catalog's own reviews
 * (`product.reviews`, the ones the PDP lists 5 at a time and the Option
 * Modal filters by option). Only the hidden set is stored; the reviews
 * themselves stay on the product (seeded from products.ts). The storefront
 * doesn't read this yet — it's the admin side of a future moderation API.
 *
 * Module-level store (no Provider), same as `adminTiktokClips.ts`. A review
 * id alone isn't unique (products share the generated review set), so the
 * key is `productId:reviewId`.
 */
const STORAGE_KEY = "charmiss:admin:reviews:hidden";

export const reviewKey = (productId: string, reviewId: string) => `${productId}:${reviewId}`;

const [hidden, setHidden] = createSignal<ReadonlySet<string>>(new Set());
let hydrated = false;

function hydrate() {
  if (hydrated || isServer) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setHidden(new Set(JSON.parse(raw) as string[]));
  } catch {
    // storage unavailable — stays in-memory for this tab.
  }
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
    },
  };
}
