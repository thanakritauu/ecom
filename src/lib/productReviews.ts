import type { Product, Review } from "./types";

/**
 * Generic review selection for any product — used by the shared Option Modal
 * (QuickAddSheet). Purely data-driven: no product ids, names or option names
 * are special-cased anywhere.
 *
 * Relation: a review belongs to a product (`Review.productId`, or implicitly
 * by living in `product.reviews`) and optionally to one of its options
 * (`Review.variantId` → `ProductVariant.id`). `variantLabel` is only the
 * display snapshot of the option name at review time — never used to match,
 * so renaming an option can't detach its reviews. The same shape works for
 * a flat review list from a future API/CMS: pass it as `source`.
 */

export type ReviewMedia = { type: "image" | "video"; src: string; poster?: string };

export type OptionReviews = {
  /** "option": this product's reviews are tied to its options, so they're filtered by the selected one (may be empty). "product": no option-level data — product-level reviews are shown. */
  mode: "option" | "product";
  reviews: Review[];
};

/** Reviews of this product (drops any that name a different product). */
export function reviewsOfProduct(product: Product, source: Review[] = product.reviews ?? []): Review[] {
  return source.filter((r) => !r.productId || r.productId === product.id);
}

/** True when at least one review is tied to one of this product's own options. */
export function hasOptionReviews(product: Product, source?: Review[]): boolean {
  const variantIds = new Set((product.variants ?? []).map((v) => v.id));
  return reviewsOfProduct(product, source).some((r) => !!r.variantId && variantIds.has(r.variantId));
}

export function reviewsForOption(product: Product, variantId: string | undefined, source?: Review[]): Review[] {
  if (!variantId) return [];
  return reviewsOfProduct(product, source).filter((r) => r.variantId === variantId);
}

/** What the review tab shows for the selected option. */
export function resolveOptionReviews(product: Product, variantId: string | undefined, source?: Review[]): OptionReviews {
  return hasOptionReviews(product, source)
    ? { mode: "option", reviews: reviewsForOption(product, variantId, source) }
    : { mode: "product", reviews: reviewsOfProduct(product, source) };
}

/** Review count per option id — only meaningful in "option" mode. */
export function reviewCountsByOption(product: Product, source?: Review[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of reviewsOfProduct(product, source)) {
    if (r.variantId) counts.set(r.variantId, (counts.get(r.variantId) ?? 0) + 1);
  }
  return counts;
}

/** Videos first, then photos — the order a review's thumbnails and the media viewer share. */
export function reviewMedia(review: Review): ReviewMedia[] {
  return [
    ...(review.videos ?? []).map((v) => ({ type: "video" as const, src: v.src, poster: v.poster })),
    ...(review.photos ?? []).map((src) => ({ type: "image" as const, src })),
  ];
}
